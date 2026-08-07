import { and, eq } from "@workspace/db";
import { db } from "@workspace/db/db";
import {
  candidate,
  candidateImportRow,
  candidateProfile,
} from "@workspace/db/schema";
import { findExistingCandidate } from "../dedup/find-existing-candidate";
import { importLog } from "../logger";
import { splitLocation } from "@workspace/db/location";
import type {
  ImportCandidateInput,
  ImportCandidateResult,
  ImportServices,
} from "../types";
import { attachImportResume } from "./attach-import-resume";
import { ensurePositionLink } from "./ensure-position-link";
import {
  duplicateActionLabel,
  resolveDuplicateAction,
} from "./resolve-duplicate-action";

async function upsertImportRow(args: {
  importId: string;
  rowIndex: number;
  status: "pending" | "success" | "skipped" | "failed";
  candidateId?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const existing = await db
    .select({ id: candidateImportRow.id })
    .from(candidateImportRow)
    .where(
      and(
        eq(candidateImportRow.importId, args.importId),
        eq(candidateImportRow.rowIndex, args.rowIndex),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(candidateImportRow)
      .set({
        status: args.status,
        candidateId: args.candidateId ?? null,
        error: args.error ?? null,
        metadata: args.metadata,
      })
      .where(eq(candidateImportRow.id, existing[0].id));
    return;
  }

  await db.insert(candidateImportRow).values({
    importId: args.importId,
    rowIndex: args.rowIndex,
    status: args.status,
    candidateId: args.candidateId ?? null,
    error: args.error ?? null,
    metadata: args.metadata,
  });
}

async function handleExistingCandidate(
  existing: { id: string; email: string },
  input: ImportCandidateInput,
  services: ImportServices,
): Promise<ImportCandidateResult> {
  let linked = false;
  let resumeUpdated = false;
  let documentId: string | undefined;

  try {
    if (input.positionId) {
      const linkResult = await ensurePositionLink({
        candidateId: existing.id,
        positionId: input.positionId,
      });
      linked = linkResult.linked;

      importLog("log", "Duplicate position link checked", {
        step: "unified.duplicate_link",
        importId: input.importId,
        rowIndex: input.rowIndex,
        existingCandidateId: existing.id,
        positionId: input.positionId,
        linked,
      });
    }

    if (input.document && input.duplicatePolicy === "update_resume") {
      const existingCandidate = await db
        .select({
          firstName: candidate.firstName,
          lastName: candidate.lastName,
        })
        .from(candidate)
        .where(eq(candidate.id, existing.id))
        .limit(1);

      const name = existingCandidate[0] ?? {
        firstName: input.firstName,
        lastName: input.lastName,
      };

      const attached = await attachImportResume({
        candidateId: existing.id,
        firstName: name.firstName,
        lastName: name.lastName,
        document: input.document,
        resumeText: input.profile?.resumeText,
        importId: input.importId,
        rowIndex: input.rowIndex,
        services,
      });
      documentId = attached.documentId;
      resumeUpdated = true;
    }

    const action = resolveDuplicateAction({ linked, resumeUpdated });

    if (!action) {
      importLog("log", "Duplicate candidate skipped — no work", {
        step: "unified.duplicate_skipped",
        importId: input.importId,
        rowIndex: input.rowIndex,
        email: existing.email,
        existingCandidateId: existing.id,
      });
      await upsertImportRow({
        importId: input.importId,
        rowIndex: input.rowIndex,
        status: "skipped",
        candidateId: existing.id,
        error: "Duplicate candidate skipped",
        metadata: input.metadata,
      });
      return {
        status: "skipped",
        candidateId: existing.id,
        error: "Duplicate candidate skipped",
      };
    }

    importLog("log", "Duplicate candidate updated", {
      step: "unified.duplicate_updated",
      importId: input.importId,
      rowIndex: input.rowIndex,
      existingCandidateId: existing.id,
      action,
      detail: duplicateActionLabel(action),
    });

    await upsertImportRow({
      importId: input.importId,
      rowIndex: input.rowIndex,
      status: "success",
      candidateId: existing.id,
      metadata: {
        ...input.metadata,
        action,
      },
    });

    return {
      status: "updated",
      candidateId: existing.id,
      documentId,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update existing candidate";

    importLog("error", "Duplicate candidate update failed", {
      step: "unified.duplicate_error",
      importId: input.importId,
      rowIndex: input.rowIndex,
      existingCandidateId: existing.id,
      error: message,
    });

    await upsertImportRow({
      importId: input.importId,
      rowIndex: input.rowIndex,
      status: "failed",
      candidateId: existing.id,
      error: message,
      metadata: input.metadata,
    });
    return { status: "failed", candidateId: existing.id, error: message };
  }
}

export async function createCandidateFromImport(
  input: ImportCandidateInput,
  services: ImportServices,
): Promise<ImportCandidateResult> {
  importLog("log", "Create candidate from import", {
    step: "unified.start",
    importId: input.importId,
    rowIndex: input.rowIndex,
    email: input.email,
    hasDocument: Boolean(input.document),
    positionId: input.positionId ?? null,
    duplicatePolicy: input.duplicatePolicy,
  });

  const email = input.email.trim().toLowerCase();
  if (!email) {
    importLog("warn", "Missing email — row failed", {
      step: "unified.missing_email",
      importId: input.importId,
      rowIndex: input.rowIndex,
    });
    await upsertImportRow({
      importId: input.importId,
      rowIndex: input.rowIndex,
      status: "failed",
      error: "Email is required",
      metadata: input.metadata,
    });
    return { status: "failed", error: "Email is required" };
  }

  await upsertImportRow({
    importId: input.importId,
    rowIndex: input.rowIndex,
    status: "pending",
    metadata: input.metadata,
  });

  importLog("log", "Checking for duplicate candidate", {
    step: "unified.dedup_check",
    importId: input.importId,
    rowIndex: input.rowIndex,
    email,
  });

  const existing = await findExistingCandidate({
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
  });

  if (existing) {
    return handleExistingCandidate(existing, input, services);
  }

  let createdCandidateId: string | undefined;

  try {
    const candidateId = crypto.randomUUID();
    createdCandidateId = candidateId;

    const { city: locationCity, state: locationState } = splitLocation(
      input.location,
    );

    const [newCandidate] = await db
      .insert(candidate)
      .values({
        id: candidateId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        phone: input.phone?.trim() || null,
        locationCity,
        locationState,
        location: input.location?.trim() || null,
        source: input.source?.trim() || "import",
        sourceUrl: input.sourceUrl?.trim() || null,
        note: input.note?.trim() || null,
      })
      .returning();

    if (!newCandidate) {
      throw new Error("Failed to create candidate");
    }

    if (input.profile) {
      await db.insert(candidateProfile).values({
        candidateId: newCandidate.id,
        school: input.profile.school?.trim() || null,
        major: input.profile.major?.trim() || null,
        graduationYear: input.profile.graduationYear ?? null,
        linkedinUrl: input.profile.linkedinUrl?.trim() || null,
        resumeText: input.profile.resumeText?.trim() || null,
      });
    }

    if (input.positionId) {
      await ensurePositionLink({
        candidateId: newCandidate.id,
        positionId: input.positionId,
      });
    }

    importLog("log", "Candidate record created", {
      step: "unified.candidate_created",
      importId: input.importId,
      rowIndex: input.rowIndex,
      candidateId: newCandidate.id,
      hasProfile: Boolean(input.profile),
      hasApplication: Boolean(input.positionId),
    });

    let documentId: string | undefined;

    if (input.document) {
      const attached = await attachImportResume({
        candidateId: newCandidate.id,
        firstName: newCandidate.firstName,
        lastName: newCandidate.lastName,
        document: input.document,
        resumeText: input.profile?.resumeText,
        importId: input.importId,
        rowIndex: input.rowIndex,
        services,
      });
      documentId = attached.documentId;
    }

    await upsertImportRow({
      importId: input.importId,
      rowIndex: input.rowIndex,
      status: "success",
      candidateId: newCandidate.id,
      metadata: {
        ...input.metadata,
        action: "created",
      },
    });

    importLog("log", "Import row succeeded", {
      step: "unified.done",
      importId: input.importId,
      rowIndex: input.rowIndex,
      candidateId: newCandidate.id,
      documentId: documentId ?? null,
    });

    return { status: "created", candidateId: newCandidate.id, documentId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create candidate";

    importLog("error", "Import row failed", {
      step: "unified.error",
      importId: input.importId,
      rowIndex: input.rowIndex,
      email,
      error: message,
    });

    // Best-effort rollback: candidate deletes cascade profile/application rows.
    if (createdCandidateId) {
      await db
        .delete(candidate)
        .where(eq(candidate.id, createdCandidateId))
        .catch(() => {});
    }

    await upsertImportRow({
      importId: input.importId,
      rowIndex: input.rowIndex,
      status: "failed",
      error: message,
      metadata: input.metadata,
    });
    return { status: "failed", error: message };
  }
}
