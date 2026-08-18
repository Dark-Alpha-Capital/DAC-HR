import { db } from "@workspace/db/db";
import { eq, and } from "@workspace/db";
import type { Personality } from "#/lib/enums";
import {
  application,
  candidate,
  candidateAiScreening,
  candidatePosition,
  position,
} from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import type { ApplicationStatus } from "#/lib/application-status";
import {
  getApplicationsFiltered,
  getCandidateById,
  getCandidateAiScreenings,
  getUsers,
} from "@workspace/db/repositories/candidate-repository";
import { getPositions } from "@workspace/db/repositories/position-repository";
import { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import { getSessionsByApplicationId } from "@workspace/db/repositories/interview-session-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import type { CandidateAiScreeningData } from "../schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type CreateApplicationInput = {
  candidateId: string;
  positionId: string;
};

export type UpdateApplicationInput = {
  applicationId: string;
  status?: ApplicationStatus;
  personality?: Personality | null;
};

export type UpdateAiScreeningInput = {
  screeningId: string;
  candidateId: string;
  analysis: string;
  structuredData?: unknown | null;
};

/**
 * Full shape returned by getApplicationWithInterviews — the single canonical
 * application detail type. Components that need a narrower view pick from it.
 */
export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof getApplicationWithInterviews>>
>;

export type ApplicationProgress = Pick<
  ApplicationDetail,
  "id" | "candidateId" | "positionId" | "rounds"
>;

export type ApplicationRounds = ApplicationDetail["rounds"];

export type ApplicationDetailData = {
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  sessions: Awaited<ReturnType<typeof getSessionsByApplicationId>>;
  aiScreenings: Array<
    Omit<
      Awaited<ReturnType<typeof getCandidateAiScreenings>>[number],
      "structuredData"
    > & { structuredData: CandidateAiScreeningData | null }
  >;
  documents: Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
  users: Awaited<ReturnType<typeof getUsers>>;
};

type ApplicationsIndexInput = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  page?: number;
};

export const applicationsService = {
  async list(deps: ApplicationsIndexInput) {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, applicationsResult] = await Promise.all([
      getPositions(),
      getApplicationsFiltered(
        deps.name,
        deps.email,
        deps.position,
        deps.status,
        currentPage,
        limit,
      ),
    ]);

    const { applications, total } = applicationsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      applications,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.name || deps.email || deps.position?.length || deps.status?.length,
      ),
    };
  },

  async getDetail(applicationId: string): Promise<ApplicationDetailData> {
    const [application, users] = await Promise.all([
      getApplicationWithInterviews(applicationId),
      getUsers(),
    ]);

    if (!application) {
      return {
        application: null,
        candidate: null,
        sessions: [],
        aiScreenings: [],
        documents: [],
        users,
      };
    }

    const [candidate, sessions, aiScreenings, documents] = await Promise.all([
      getCandidateById(application.candidateId),
      getSessionsByApplicationId(applicationId).catch(() => []),
      getCandidateAiScreenings(application.candidateId).catch(() => []),
      getDocumentsByCandidateId(application.candidateId).catch(() => []),
    ]);

    return {
      application,
      candidate,
      sessions,
      aiScreenings: aiScreenings.map((screening) => ({
        ...screening,
        // SAFETY: structuredData is written by the AI pipeline as structured
        // output validated against candidateAiScreeningSchema before persisting.
        structuredData:
          screening.structuredData as CandidateAiScreeningData | null,
      })),
      documents,
      users,
    };
  },

  async create(input: CreateApplicationInput, actor: Actor) {
    const { candidateId, positionId } = input;

    try {
      const [candidateRecord] = await db
        .select({ id: candidate.id })
        .from(candidate)
        .where(eq(candidate.id, candidateId))
        .limit(1);

      if (!candidateRecord) {
        return { error: "Candidate not found" };
      }

      const [positionRecord] = await db
        .select({ id: position.id, name: position.name })
        .from(position)
        .where(eq(position.id, positionId))
        .limit(1);

      if (!positionRecord) {
        return { error: "Position not found" };
      }

      const [existingApplication] = await db
        .select({ id: application.id })
        .from(application)
        .where(
          and(
            eq(application.candidateId, candidateId),
            eq(application.positionId, positionId),
          ),
        )
        .limit(1);

      if (existingApplication) {
        return { error: "Application already exists for this position" };
      }

      const [newApplication] = await db
        .insert(application)
        .values({
          candidateId,
          positionId,
          status: "ai_screening",
        })
        .returning();

      if (!newApplication) {
        return { error: "Failed to create application" };
      }

      await db
        .insert(candidatePosition)
        .values({
          candidateId,
          positionId,
        })
        .onConflictDoNothing();

      insertAuditLog({
        userId: actor.id,
        action: "create_application",
        entityType: "application",
        entityId: newApplication.id,
        details: {
          application: {
            id: newApplication.id,
            candidateId: newApplication.candidateId,
            positionId: newApplication.positionId,
            status: newApplication.status,
            createdAt: newApplication.createdAt.toISOString(),
          },
          position: {
            id: positionRecord.id,
            name: positionRecord.name,
          },
          createdBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, application: newApplication };
    } catch (error) {
      console.error("Error creating application:", error);
      return { error: "Failed to create application" };
    }
  },

  async update(input: UpdateApplicationInput, actor: Actor) {
    const { applicationId, status, personality } = input;

    try {
      const updateData: Partial<typeof application.$inferInsert> = {};
      if (status !== undefined) updateData.status = status;
      if (personality !== undefined) updateData.personality = personality;

      const [updatedApplication] = await db
        .update(application)
        .set(updateData)
        .where(eq(application.id, applicationId))
        .returning();

      if (!updatedApplication) {
        return { error: "Application not found" };
      }

      insertAuditLog({
        userId: actor.id,
        action: "update_application",
        entityType: "application",
        entityId: updatedApplication.id,
        details: {
          application: {
            id: updatedApplication.id,
            candidateId: updatedApplication.candidateId,
            positionId: updatedApplication.positionId,
            status: updatedApplication.status,
            personality: updatedApplication.personality,
            updatedAt: updatedApplication.updatedAt.toISOString(),
          },
          input: {
            applicationId,
            status,
            personality,
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

      return { success: true, data: updatedApplication };
    } catch (error) {
      console.error("Error updating application", error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to update application" };
    }
  },

  async updateAiScreening(input: UpdateAiScreeningInput, actor: Actor) {
    const { screeningId, analysis, structuredData } = input;

    if (!analysis || analysis.trim() === "") {
      return { error: "Analysis is required" };
    }

    try {
      const [currentScreening] = await db
        .select()
        .from(candidateAiScreening)
        .where(eq(candidateAiScreening.id, screeningId))
        .limit(1);

      if (!currentScreening) {
        return { error: "AI screening not found" };
      }

      const updateFields: Partial<typeof candidateAiScreening.$inferInsert> = {
        analysis: analysis.trim(),
        updatedAt: new Date(),
      };

      if (structuredData !== undefined) {
        // SAFETY: the AI pipeline validates structuredData against
        // candidateAiScreeningSchema as structured output before persisting.
        updateFields.structuredData =
          structuredData as NonNullable<
            typeof candidateAiScreening.$inferInsert.structuredData
          >;
      }

      const [updatedScreening] = await db
        .update(candidateAiScreening)
        .set(updateFields)
        .where(eq(candidateAiScreening.id, screeningId))
        .returning();

      if (!updatedScreening) {
        return { error: "Failed to update AI screening" };
      }
      insertAuditLog({
        userId: actor.id,
        action: "update_ai_screening",
        entityType: "candidate_ai_screening",
        entityId: updatedScreening.id,
        details: {
          aiScreening: {
            id: updatedScreening.id,
            candidateId: updatedScreening.candidateId,
            positionId: updatedScreening.positionId,
            applicationId: updatedScreening.applicationId,
            model: updatedScreening.model,
            updatedAt: updatedScreening.updatedAt.toISOString(),
          },
          input: {
            analysis: analysis.trim(),
            structuredData: updateFields.structuredData ?? null,
          },
          previous: {
            analysis: currentScreening.analysis,
            structuredData: currentScreening.structuredData,
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

      return { success: true, data: updatedScreening };
    } catch (error) {
      console.error("Error updating AI screening:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update AI screening",
      };
    }
  },

  async deleteAiScreening(
    screeningId: string,
    candidateId: string,
    actor: Actor,
  ) {
    try {
      const [screeningData] = await db
        .select()
        .from(candidateAiScreening)
        .where(eq(candidateAiScreening.id, screeningId))
        .limit(1);

      if (!screeningData) {
        return { error: "AI screening not found" };
      }

      await db
        .delete(candidateAiScreening)
        .where(eq(candidateAiScreening.id, screeningId));
      insertAuditLog({
        userId: actor.id,
        action: "delete_ai_screening",
        entityType: "candidate_ai_screening",
        entityId: screeningId,
        details: {
          aiScreening: {
            id: screeningData.id,
            candidateId: screeningData.candidateId,
            positionId: screeningData.positionId,
            applicationId: screeningData.applicationId,
            model: screeningData.model,
            createdAt: screeningData.createdAt.toISOString(),
          },
          deletedBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true };
    } catch (error) {
      console.error("Error deleting AI screening:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete AI screening",
      };
    }
  },
};
