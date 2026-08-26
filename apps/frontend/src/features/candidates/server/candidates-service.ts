import { db } from "@workspace/db/db";
import { eq, asc, desc, sql } from "@workspace/db";
import {
  application,
  candidate,
  candidateChecklistItem,
  candidateDocument,
  candidateImport,
  candidateOnboarding,
  candidatePosition,
  type Candidate,
} from "@workspace/db/schema";
import {
  CandidateConflictError,
  emailConflictMessage,
  errorText,
  mapCandidateUniqueConstraint,
} from "./unique-constraint";
import type { BatchItem } from "drizzle-orm/batch";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import {
  getCandidateAiScreenings,
  getLatestCandidateAiScreening,
  getOrCreateCandidateOnboarding,
  getUsers,
  saveCandidateAiScreening,
} from "@workspace/db/repositories/candidate-repository";
import {
  getCandidateImportById,
  getCandidateImportRows,
  getCandidateImportWorkflowId,
  createCandidateImportRecord,
  cancelCandidateImport,
  updateCandidateImportStatus,
} from "@workspace/db/repositories/candidate-import-repository";
import {
  getPositions,
  getRoundsByPositionId,
} from "@workspace/db/repositories/position-repository";
import { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import {
  getKanbanFilteredTotalCount,
  getKanbanColumnCandidates as getKanbanColumnCandidatesFn,
} from "@workspace/db/repositories/kanban-repository";
import {
  getCandidateWithApplications,
  getCandidatesWithPositionsFiltered,
} from "@workspace/db/repositories/candidate-repository";
import { parseCandidateSortOption } from "@workspace/db/candidate-list-filters";
import type { CandidateFilters } from "../kanban-types";
import type { Session } from "better-auth";
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

async function findCandidateByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const [existing] = await db
    .select({
      id: candidate.id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    })
    .from(candidate)
    .where(sql`lower(${candidate.email}) = ${normalizedEmail}`)
    .limit(1);

  return existing ?? null;
}

async function toCandidateConflictError(
  error: Error,
  email: string,
): Promise<CandidateConflictError | null> {
  const conflict = mapCandidateUniqueConstraint(errorText(error));
  if (!conflict) return null;

  if (conflict.code === "CANDIDATE_EMAIL_EXISTS") {
    const existing = await findCandidateByEmail(email);
    if (existing) {
      return new CandidateConflictError(emailConflictMessage(existing), {
        code: conflict.code,
        existingCandidateId: existing.id,
      });
    }
  }

  return new CandidateConflictError(conflict.message, { code: conflict.code });
}

export const createCandidateWithPositions = async (
  input: CreateCandidateWithPositionsInput,
) => {
  const positionIds = [
    ...new Set(
      input.positionIds?.map((id) => id.trim()).filter(Boolean) ?? [],
    ),
  ];

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

  // SAFETY: every element is a Drizzle SQLite insert statement, which is part of
  // the BatchItem<"sqlite"> union that db.batch accepts; the tuple is always
  // non-empty because candidateInsert is unconditionally present.
  const statements = [
    candidateInsert,
    ...applicationInserts,
    ...candidatePositionInserts,
  ] as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];

  try {
    const results = await db.batch(statements);

    // SAFETY: results[0] is the .returning() result of candidateInsert, so it is
    // exactly the Candidate[] matching the newly inserted row.
    const [newCandidate] = results[0] as Candidate[];

    if (!newCandidate) {
      throw new Error("Failed to create candidate");
    }

    return {
      candidate: newCandidate,
      applicationIds,
      positionIds,
    };
  } catch (error) {
    if (error instanceof Error) {
      const conflict = await toCandidateConflictError(error, input.email);
      if (conflict) throw conflict;
    }
    throw error;
  }
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

    const conflict =
      error instanceof Error
        ? await toCandidateConflictError(error, email)
        : null;
    if (conflict) {
      return { error: conflict.message };
    }

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


const getChecklistItemsByCandidateId = async (candidateId: string) => {
  try {
    return await db
      .select()
      .from(candidateChecklistItem)
      .where(eq(candidateChecklistItem.candidateId, candidateId))
      .orderBy(asc(candidateChecklistItem.createdAt));
  } catch (error) {
    console.error("Error fetching checklist items", error);
    return [];
  }
};

const createChecklistItem = async (data: {
  candidateId: string;
  label: string;
}) => {
  const [row] = await db
    .insert(candidateChecklistItem)
    .values({
      candidateId: data.candidateId,
      label: data.label,
      checked: false,
    })
    .returning();
  return row ?? null;
};

const updateChecklistItem = async (
  id: string,
  data: { label?: string; checked?: boolean },
) => {
  const values: Partial<typeof candidateChecklistItem.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.label !== undefined) values.label = data.label;
  if (data.checked !== undefined) values.checked = data.checked;

  const [row] = await db
    .update(candidateChecklistItem)
    .set(values)
    .where(eq(candidateChecklistItem.id, id))
    .returning();
  return row ?? null;
};

const deleteChecklistItem = async (id: string) => {
  const [row] = await db
    .delete(candidateChecklistItem)
    .where(eq(candidateChecklistItem.id, id))
    .returning({ id: candidateChecklistItem.id });
  return row ?? null;
};

export const updateChecklistItems = async (
  candidateId: string,
  items: ChecklistItemInput[],
  actor: Actor,
) => {
  try {
    const keptIds = new Set(
      items
        .filter((item): item is ChecklistItemInput & { id: string } =>
          Boolean(item.id),
        )
        .map((item) => item.id),
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

// ---- Read-side (queries) ----

type CandidatesIndexInput = CandidateFilters & {
  page?: number;
  view?: "table" | "kanban";
};

type ActorSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    image?: string | null;
  };
  session: Session;
};

export type CandidateDetailData = {
  candidate: Awaited<ReturnType<typeof getCandidateWithApplications>>;
  users: Awaited<ReturnType<typeof getUsers>>;
  session: Session;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    image?: string | null;
  };
  documents: Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
  screenings: Array<
    Awaited<ReturnType<typeof getCandidateAiScreenings>>[number] & {
      structuredData: any;
    }
  >;
  onboardingData: OnboardingTasks;
  checklistItems: Array<{
    id: string;
    label: string;
    checked: boolean;
  }>;
  applicationDetails: Awaited<
    ReturnType<typeof getApplicationWithInterviews>
  >[];
  initialApplicationId?: string;
};

export const candidatesService = {
  createWithPositions: createCandidateWithPositions,
  deleteWithAssets: deleteCandidateWithAssets,
  update: updateCandidate,
  toggleOnboardingTask,
  updateOnboardingTasks,
  updateChecklistItems,
  createDocument: createCandidateDocument,
  deleteDocument: deleteCandidateDocument,
  updateImportOriginalFileUrl,
  listRecentImports: listRecentCandidateImports,

  async listIndex(deps: CandidatesIndexInput) {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const sort = parseCandidateSortOption(deps.sort);
    const isKanbanView = deps.view === "kanban";

    const hasFilters = Boolean(
      deps.name ||
      deps.email ||
      deps.position?.length ||
      deps.status?.length ||
      deps.source?.length ||
      (deps.sort && deps.sort !== "newest"),
    );

    if (isKanbanView) {
      const [{ positions }, totalCount] = await Promise.all([
        getPositions(),
        getKanbanFilteredTotalCount({
          name: deps.name,
          email: deps.email,
          position: deps.position,
          status: deps.status,
          source: deps.source,
          sort,
        }),
      ]);

      return {
        positions: positions.map((p) => ({ id: p.id, name: p.name })),
        candidates: [],
        currentPage: 1,
        limit,
        totalCount,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        hasFilters,
      };
    }

    const [{ positions }, candidatesResult] = await Promise.all([
      getPositions(),
      getCandidatesWithPositionsFiltered(
        deps.name,
        deps.email,
        deps.position,
        currentPage,
        limit,
        deps.status,
        deps.source,
        sort,
      ),
    ]);

    const { candidates, total: totalCount } = candidatesResult;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      candidates,
      currentPage,
      limit,
      totalCount,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters,
    };
  },

  async getNewOptions(session: ActorSession) {
    const { positions } = await getPositions();

    const positionRounds: Record<
      string,
      Array<{ roundTemplateId: string; name: string }>
    > = {};
    await Promise.all(
      positions.map(async (p) => {
        const rounds = await getRoundsByPositionId(p.id);
        positionRounds[p.id] = rounds.map((r) => ({
          roundTemplateId: r.id,
          name: r.name,
        }));
      }),
    );

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      positionRounds,
      userSession: session.session,
    };
  },

  async getDetail(
    data: { uid: string; application?: string },
    session: ActorSession,
  ): Promise<CandidateDetailData> {
    const [users, candidate, documents, screenings] = await Promise.all([
      getUsers(),
      getCandidateWithApplications(data.uid),
      getDocumentsByCandidateId(data.uid),
      getCandidateAiScreenings(data.uid),
    ]);

    if (!candidate) {
      return {
        candidate: null,
        users: [],
        session: session.session,
        currentUser: session.user,
        documents: [],
        screenings: [],
        onboardingData: {
          contractSigned: false,
          emailProvided: false,
          onboardingPacketSent: false,
          companyEmailActivate: false,
        },
        checklistItems: [],
        applicationDetails: [],
        initialApplicationId: data.application,
      };
    }

    const [applicationDetails, rawOnboarding, checklistItems] =
      await Promise.all([
        Promise.all(
          candidate.applications.map((app) =>
            getApplicationWithInterviews(app.id),
          ),
        ),
        getOrCreateCandidateOnboarding(candidate.id),
        getChecklistItemsByCandidateId(candidate.id),
      ]);

    const onboardingData = {
      contractSigned: rawOnboarding.contractSigned ?? false,
      emailProvided: rawOnboarding.emailProvided ?? false,
      onboardingPacketSent: rawOnboarding.onboardingPacketSent ?? false,
      companyEmailActivate: rawOnboarding.companyEmailActivate ?? false,
    };

    return {
      candidate,
      users,
      session: session.session,
      currentUser: session.user,
      documents,
      screenings,
      onboardingData,
      checklistItems,
      applicationDetails,
      initialApplicationId: data.application,
    };
  },

  async getEdit(uid: string) {
    const candidate = await getCandidateById(uid);
    return { candidate };
  },

  async getDocumentEdit(uid: string, documentId: string) {
    const documents = await getDocumentsByCandidateId(uid);
    const document = documents.find((doc) => doc.id === documentId);
    return { document };
  },

  async listDocuments(candidateId: string) {
    const documents = await getDocumentsByCandidateId(candidateId);
    return { documents };
  },

  async getDocumentForIndexing(documentId: string) {
    const [row] = await db
      .select({
        candidateId: candidateDocument.candidateId,
        name: candidateDocument.name,
        category: candidateDocument.category,
        url: candidateDocument.url,
      })
      .from(candidateDocument)
      .where(eq(candidateDocument.id, documentId))
      .limit(1);
    if (!row) {
      throw new Error(`Candidate document ${documentId} not found`);
    }
    return row;
  },

  async setDocumentVectorizeNamespace(documentId: string, namespace: string) {
    await db
      .update(candidateDocument)
      .set({ vectorizeNamespace: namespace })
      .where(eq(candidateDocument.id, documentId));
  },

  async insertAudit(input: Parameters<typeof insertAuditLog>[0]) {
    return insertAuditLog(input);
  },

  async getCandidateWithApplications(uid: string) {
    return getCandidateWithApplications(uid);
  },

  async getKanbanColumnCandidates(
    columnStatus: import("@workspace/db/application-status").ApplicationStatus,
    filters: import("@workspace/db/repositories/kanban-repository").KanbanColumnFilters,
    cursor?: string,
    limit?: number,
  ) {
    return getKanbanColumnCandidatesFn(columnStatus, filters, cursor, limit);
  },

  async getAiScreenings(candidateId: string, positionId?: string) {
    return getCandidateAiScreenings(candidateId, positionId);
  },

  async getLatestAiScreening(candidateId: string, positionId?: string) {
    return getLatestCandidateAiScreening(candidateId, positionId);
  },

  async saveAiScreening(
    params: Parameters<typeof saveCandidateAiScreening>[0],
  ) {
    return saveCandidateAiScreening(params);
  },

  async getImportById(importId: string) {
    return getCandidateImportById(importId);
  },

  async createImportRecord(
    input: Parameters<typeof createCandidateImportRecord>[0],
  ) {
    return createCandidateImportRecord(input);
  },

  async getImportRows(importId: string) {
    return getCandidateImportRows(importId);
  },

  getImportWorkflowId(importId: string) {
    return getCandidateImportWorkflowId(importId);
  },

  async cancelImport(importId: string) {
    return cancelCandidateImport(importId);
  },

  async updateImportStatus(
    importId: string,
    status: Parameters<typeof updateCandidateImportStatus>[1],
    updates?: Parameters<typeof updateCandidateImportStatus>[2],
  ) {
    return updateCandidateImportStatus(importId, status, updates);
  },

  async updateImportProgress(
    importId: string,
    data: {
      totalCandidates?: number;
      processedCandidates?: number;
    },
  ) {
    const updates: Partial<typeof candidateImport.$inferInsert> = {};
    if (data.totalCandidates !== undefined) {
      updates.totalCandidates = data.totalCandidates;
    }
    if (data.processedCandidates !== undefined) {
      updates.processedCandidates = data.processedCandidates;
    }
    return db
      .update(candidateImport)
      .set(updates)
      .where(eq(candidateImport.id, importId));
  },
};
export type CandidatesIndexData = Awaited<
  ReturnType<typeof candidatesService.listIndex>
>;
