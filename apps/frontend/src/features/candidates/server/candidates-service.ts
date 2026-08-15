import { db } from "@workspace/db/db";
import { eq, and, inArray, desc } from "@workspace/db";
import {
  application,
  candidate,
  candidateDocument,
  candidateImport,
  candidateOnboarding,
  candidatePosition,
  type Candidate,
} from "@workspace/db/schema";
import type { BatchItem } from "drizzle-orm/batch";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItemsByCandidateId,
  updateChecklistItem,
} from "@workspace/db/repositories/candidate-checklist-repository";
import { deleteFile } from "#/lib/storage";

export type CreateCandidateWithPositionsInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  note?: string | null;
  positionIds?: string[];
};

export const createCandidateWithPositions = async (
  input: CreateCandidateWithPositionsInput,
) => {
  const positionIds =
    input.positionIds?.map((id) => id.trim()).filter(Boolean) ?? [];

  const candidateId = crypto.randomUUID();
  const applicationIds = positionIds.map(() => crypto.randomUUID());

  const candidateInsert = db
    .insert(candidate)
    .values({
      id: candidateId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone?.trim() || null,
      locationCity: input.locationCity?.trim() || null,
      locationState: input.locationState?.trim() || null,
      location: input.location?.trim() || null,
      source: input.source || null,
      sourceUrl: input.sourceUrl?.trim() || null,
      note: input.note?.trim() || null,
    })
    .returning();

  const applicationInserts = positionIds.map((positionId, index) =>
    db.insert(application).values({
      id: applicationIds[index],
      candidateId,
      positionId,
      status: "ai_screening",
    }),
  );

  const candidatePositionInserts = positionIds.map((positionId) =>
    db.insert(candidatePosition).values({
      candidateId,
      positionId,
    }),
  );

  const statements = [
    candidateInsert,
    ...applicationInserts,
    ...candidatePositionInserts,
  ] as unknown as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];

  const results = await db.batch(statements);

  const [newCandidate] = results[0] as Candidate[];

  if (!newCandidate) {
    throw new Error("Failed to create candidate");
  }

  return {
    candidate: newCandidate,
    applicationIds,
    positionIds,
  };
};

export type DeleteCandidateResult = {
  candidate: NonNullable<Awaited<ReturnType<typeof getCandidateById>>>;
  deletedDocuments: Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
};

export const deleteCandidateWithAssets = async (
  candidateId: string,
): Promise<DeleteCandidateResult | null> => {
  const candidateData = await getCandidateById(candidateId);
  if (!candidateData) {
    return null;
  }

  const candidateDocuments = await getDocumentsByCandidateId(candidateId);

  const deletionPromises = candidateDocuments.map(async (doc) => {
    const promises: Promise<boolean>[] = [];

    if (doc.url) {
      promises.push(
        deleteFile(doc.url).catch((error) => {
          console.error(
            `[deleteCandidateWithAssets] Failed deleting Nextcloud doc ${doc.id}:`,
            error,
          );
          return false;
        }),
      );
    }

    await Promise.all(promises);
  });

  await Promise.all(deletionPromises);
  await db.delete(candidate).where(eq(candidate.id, candidateId));

  return {
    candidate: candidateData,
    deletedDocuments: candidateDocuments,
  };
};

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type UpdateCandidateInput = {
  candidateId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  note?: string | null;
  positionIds: string[];
};

export const updateCandidate = async (
  input: UpdateCandidateInput,
  actor: Actor,
) => {
  const {
    candidateId,
    firstName,
    lastName,
    email,
    phone,
    location,
    locationCity,
    locationState,
    source,
    sourceUrl,
    note,
    positionIds,
  } = input;

  const normalizedPositionIds = positionIds
    .map((id) => id.trim())
    .filter(Boolean);

  try {
    const [updatedCandidate] = await db
      .update(candidate)
      .set({
        firstName,
        lastName,
        email,
        phone: phone || null,
        locationCity: locationCity?.trim() || null,
        locationState: locationState?.trim() || null,
        location: location || null,
        source: source || null,
        sourceUrl: sourceUrl?.trim() || null,
        note: note || null,
        updatedAt: new Date(),
      })
      .where(eq(candidate.id, candidateId))
      .returning();

    if (!updatedCandidate) {
      return { error: "Candidate not found" };
    }

    // Get existing applications for this candidate
    const existingApplications = await db
      .select({ positionId: application.positionId })
      .from(application)
      .where(eq(application.candidateId, candidateId));

    const existingPositions = await db
      .select({ positionId: candidatePosition.positionId })
      .from(candidatePosition)
      .where(eq(candidatePosition.candidateId, candidateId));

    const existingPositionIds = new Set([
      ...existingApplications.map((a) => a.positionId),
      ...existingPositions.map((p) => p.positionId),
    ]);

    // Create applications for new positions (skip already applied positions)
    let applicationsCreated = 0;
    for (const positionId of normalizedPositionIds) {
      if (!existingPositionIds.has(positionId)) {
        await db.insert(application).values({
          candidateId,
          positionId,
          status: "ai_screening",
        });
        await db.insert(candidatePosition).values({
          candidateId,
          positionId,
        });
        applicationsCreated++;
      }
    }

    insertAuditLog({
      userId: actor.id,
      action: "update_candidate",
      entityType: "candidate",
      entityId: updatedCandidate.id,
      details: {
        candidate: {
          id: updatedCandidate.id,
          firstName: updatedCandidate.firstName,
          lastName: updatedCandidate.lastName,
          email: updatedCandidate.email,
          phone: updatedCandidate.phone,
          location: updatedCandidate.location,
          locationCity: updatedCandidate.locationCity,
          locationState: updatedCandidate.locationState,
          source: updatedCandidate.source,
          sourceUrl: updatedCandidate.sourceUrl,
          note: updatedCandidate.note,
          updatedAt: updatedCandidate.updatedAt.toISOString(),
        },
        input: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          location: location || null,
          locationCity: locationCity?.trim() || null,
          locationState: locationState?.trim() || null,
          source: source || null,
          sourceUrl: sourceUrl?.trim() || null,
          note: note || null,
          positionIds: normalizedPositionIds,
        },
        updatedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          positionIdsUpdated: normalizedPositionIds,
          applicationsCreated,
          existingApplicationCount: existingApplications.length,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: updatedCandidate };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update candidate" };
  }
};

export type OnboardingTaskKey =
  | "contractSigned"
  | "emailProvided"
  | "onboardingPacketSent"
  | "companyEmailActivate";

const buildTaskUpdate = (
  taskKey: OnboardingTaskKey,
  value: boolean,
): Pick<
  typeof candidateOnboarding.$inferInsert,
  | "contractSigned"
  | "emailProvided"
  | "onboardingPacketSent"
  | "companyEmailActivate"
> => {
  switch (taskKey) {
    case "contractSigned":
      return { contractSigned: value };
    case "emailProvided":
      return { emailProvided: value };
    case "onboardingPacketSent":
      return { onboardingPacketSent: value };
    case "companyEmailActivate":
      return { companyEmailActivate: value };
  }
};

export const toggleOnboardingTask = async (
  candidateId: string,
  taskKey: OnboardingTaskKey,
  value: boolean,
) => {
  const [upserted] = await db
    .insert(candidateOnboarding)
    .values({
      candidateId,
      ...buildTaskUpdate(taskKey, value),
    })
    .onConflictDoUpdate({
      target: candidateOnboarding.candidateId,
      set: buildTaskUpdate(taskKey, value),
    })
    .returning()
    .execute();

  return upserted;
};

export type OnboardingTasks = {
  contractSigned: boolean;
  emailProvided: boolean;
  onboardingPacketSent: boolean;
  companyEmailActivate: boolean;
};

export const updateOnboardingTasks = async (
  candidateId: string,
  tasks: OnboardingTasks,
  actor: Actor,
) => {
  try {
    const [upserted] = await db
      .insert(candidateOnboarding)
      .values({
        candidateId,
        contractSigned: tasks.contractSigned,
        emailProvided: tasks.emailProvided,
        onboardingPacketSent: tasks.onboardingPacketSent,
        companyEmailActivate: tasks.companyEmailActivate,
      })
      .onConflictDoUpdate({
        target: candidateOnboarding.candidateId,
        set: {
          contractSigned: tasks.contractSigned,
          emailProvided: tasks.emailProvided,
          onboardingPacketSent: tasks.onboardingPacketSent,
          companyEmailActivate: tasks.companyEmailActivate,
        },
      })
      .returning()
      .execute();

    if (!upserted) {
      return { success: false, error: "Failed to update onboarding record" };
    }
    insertAuditLog({
      userId: actor.id,
      action: "upsert_onboarding",
      entityType: "candidate_onboarding",
      entityId: upserted.id,
      details: {
        onboarding: {
          id: upserted.id,
          candidateId: upserted.candidateId,
          contractSigned: upserted.contractSigned,
          emailProvided: upserted.emailProvided,
          onboardingPacketSent: upserted.onboardingPacketSent,
          companyEmailActivate: upserted.companyEmailActivate,
        },
        input: {
          candidateId,
          tasks,
        },
        updatedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: upserted };
  } catch (error) {
    console.error("Error updating onboarding tasks:", error);
    return { success: false, error: "Failed to update onboarding tasks" };
  }
};

export type ChecklistItemInput = {
  id?: string;
  label: string;
  checked: boolean;
};

export const updateChecklistItems = async (
  candidateId: string,
  items: ChecklistItemInput[],
  actor: Actor,
) => {
  try {
    const keptIds = new Set(
      items.filter((item) => item.id).map((item) => item.id as string),
    );

    const existing = await getChecklistItemsByCandidateId(candidateId);

    await Promise.all(
      items.map(async (item) => {
        if (item.id) {
          await updateChecklistItem(item.id, {
            label: item.label,
            checked: item.checked,
          });
        } else if (item.label.trim()) {
          await createChecklistItem({
            candidateId,
            label: item.label.trim(),
          });
        }
      }),
    );

    await Promise.all(
      existing
        .filter((item) => !keptIds.has(item.id))
        .map((item) => deleteChecklistItem(item.id)),
    );

    insertAuditLog({
      userId: actor.id,
      action: "update_checklist",
      entityType: "candidate_checklist",
      entityId: candidateId,
      details: {
        items,
        updatedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true as const };
  } catch (error) {
    console.error("Error updating checklist items:", error);
    return {
      success: false as const,
      error: "Failed to update checklist",
    };
  }
};

export type CreateCandidateDocumentInput = {
  candidateId: string;
  name: string;
  description?: string | null;
  category: "resume" | "cover-letter" | "portfolio" | "other";
  url: string;
  tags?: string[];
  nextcloudFilePath?: string;
};

export const createCandidateDocument = async (
  input: CreateCandidateDocumentInput,
  actor: Actor,
) => {
  const [newCandidateDocument] = await db
    .insert(candidateDocument)
    .values({
      candidateId: input.candidateId,
      name: input.name,
      description: input.description?.trim() || null,
      category: input.category || "other",
      url: input.url,
      tags: input.tags?.length ? input.tags : null,
    })
    .returning();

  insertAuditLog({
    userId: actor.id,
    action: "create_candidate_document",
    entityType: "candidate_document",
    entityId: newCandidateDocument?.id || "",
    details: {
      candidateDocument: {
        id: newCandidateDocument?.id,
        candidateId: input.candidateId,
        name: input.name,
        category: input.category,
        url: input.url,
        createdAt: newCandidateDocument?.createdAt.toISOString(),
      },
      createdBy: { id: actor.id, email: actor.email, name: actor.name },
      metadata: { timestamp: new Date().toISOString() },
    },
  }).catch((error) => console.error("Audit log error:", error));

  return newCandidateDocument;
};

export const deleteCandidateDocument = async (
  candidateId: string,
  documentId: string,
  actor: Actor,
) => {
  const [documentData] = await db
    .select()
    .from(candidateDocument)
    .where(eq(candidateDocument.id, documentId))
    .limit(1);

  if (!documentData) {
    return { error: "Document not found" };
  }
  if (documentData.candidateId !== candidateId) {
    return { error: "Document does not belong to this candidate" };
  }

  await db
    .delete(candidateDocument)
    .where(eq(candidateDocument.id, documentId));

  insertAuditLog({
    userId: actor.id,
    action: "delete_candidate_document",
    entityType: "candidate_document",
    entityId: documentId,
    details: {
      candidateDocument: {
        id: documentData.id,
        candidateId: documentData.candidateId,
        name: documentData.name,
      },
      deletedBy: { id: actor.id, email: actor.email, name: actor.name },
      metadata: { timestamp: new Date().toISOString() },
    },
  }).catch((err) => console.error("Audit log error:", err));

  return { success: true };
};

export const updateImportOriginalFileUrl = async (
  importId: string,
  url: string,
) => {
  await db
    .update(candidateImport)
    .set({ originalFileUrl: url })
    .where(eq(candidateImport.id, importId));
};

export const listRecentCandidateImports = async () => {
  return db
    .select()
    .from(candidateImport)
    .orderBy(desc(candidateImport.createdAt))
    .limit(20);
};
