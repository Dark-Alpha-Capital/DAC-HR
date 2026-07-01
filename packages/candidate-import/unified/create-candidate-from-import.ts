import { and, eq } from "@workspace/db";
import { db } from "@workspace/db/db";
import {
  application,
  candidate,
  candidateDocument,
  candidateImportRow,
  candidatePosition,
  candidateProfile,
} from "@workspace/db/schema";
import {
  buildNamedEntityFolderPath,
  formatPersonName,
} from "@workspace/nextcloud";
import { findExistingCandidate } from "../dedup/find-existing-candidate";
import { importLog } from "../logger";
import type {
  ImportCandidateInput,
  ImportCandidateResult,
  ImportServices,
} from "../types";

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

  if (existing && input.duplicatePolicy === "skip") {
    importLog("log", "Duplicate candidate skipped", {
      step: "unified.duplicate_skipped",
      importId: input.importId,
      rowIndex: input.rowIndex,
      email,
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

  let createdCandidateId: string | undefined;

  try {
    const candidateId = crypto.randomUUID();
    createdCandidateId = candidateId;

    const [newCandidate] = await db
      .insert(candidate)
      .values({
        id: candidateId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        phone: input.phone?.trim() || null,
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
      await db.insert(application).values({
        candidateId: newCandidate.id,
        positionId: input.positionId,
        status: "ai_screening",
      });
      await db.insert(candidatePosition).values({
        candidateId: newCandidate.id,
        positionId: input.positionId,
      });
    }

    const result = newCandidate;

    importLog("log", "Candidate record created", {
      step: "unified.candidate_created",
      importId: input.importId,
      rowIndex: input.rowIndex,
      candidateId: result.id,
      hasProfile: Boolean(input.profile),
      hasApplication: Boolean(input.positionId),
    });

    let documentId: string | undefined;
    let nextcloudFilePath: string | undefined;
    let documentUrl: string | undefined;

    if (input.document) {
      const folderPath = buildNamedEntityFolderPath({
        root: "/ATS/candidates",
        name: formatPersonName(result.firstName, result.lastName),
        id: result.id,
      });

      importLog("log", "Uploading document to Nextcloud", {
        step: "unified.document_upload_start",
        importId: input.importId,
        rowIndex: input.rowIndex,
        candidateId: result.id,
        fileName: input.document.fileName,
        folderPath,
      });

      const uploadResult = await services.uploadToNextcloud({
        buffer: input.document.buffer.slice(),
        fileName: input.document.fileName,
        folderPath,
      });

      if (!uploadResult) {
        throw new Error("Failed to upload resume to Nextcloud");
      }

      documentUrl = uploadResult.url;
      nextcloudFilePath = uploadResult.filePath;

      importLog("log", "Document uploaded to Nextcloud", {
        step: "unified.document_uploaded",
        importId: input.importId,
        rowIndex: input.rowIndex,
        candidateId: result.id,
        filePath: nextcloudFilePath,
      });

      const [doc] = await db
        .insert(candidateDocument)
        .values({
          candidateId: result.id,
          name: input.document.fileName,
          description: "Imported resume",
          category: input.document.category,
          url: uploadResult.url,
          tags: ["import"],
        })
        .returning();

      documentId = doc?.id;

      if (input.profile?.resumeText) {
        await db
          .update(candidateProfile)
          .set({ resumeText: input.profile.resumeText })
          .where(eq(candidateProfile.candidateId, result.id));
      }
    }

    await upsertImportRow({
      importId: input.importId,
      rowIndex: input.rowIndex,
      status: "success",
      candidateId: result.id,
      metadata: input.metadata,
    });

    if (
      documentId &&
      nextcloudFilePath &&
      documentUrl &&
      services.triggerDocumentIndexing
    ) {
      importLog("log", "Triggering document indexing workflow", {
        step: "unified.indexing_triggered",
        importId: input.importId,
        rowIndex: input.rowIndex,
        candidateId: result.id,
        documentId,
      });

      await services.triggerDocumentIndexing({
        documentId,
        candidateId: result.id,
        nextcloudFilePath,
        metadata: {
          name: input.document!.fileName,
          category: input.document!.category,
          candidateId: result.id,
          url: documentUrl,
        },
      });
    }

    importLog("log", "Import row succeeded", {
      step: "unified.done",
      importId: input.importId,
      rowIndex: input.rowIndex,
      candidateId: result.id,
      documentId: documentId ?? null,
    });

    return { status: "created", candidateId: result.id, documentId };
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
