import { db } from "@workspace/db/db";
import { eq, and } from "@workspace/db";
import {
  application,
  candidate,
  candidateAiScreening,
  candidatePosition,
  position,
} from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { sendMail } from "@workspace/mail";
import { getServerEmailSender } from "#/lib/server/email-sender";
import type { ApplicationStatus } from "@workspace/db/application-status";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type CreateApplicationInput = {
  candidateId: string;
  positionId: string;
};

export const createApplication = async (
  input: CreateApplicationInput,
  actor: Actor,
) => {
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
};

export type UpdateApplicationInput = {
  applicationId: string;
  status?: ApplicationStatus;
  personality?:
    | "ENFJ"
    | "ENFP"
    | "ENTJ"
    | "ENTP"
    | "ESFJ"
    | "ESFP"
    | "ESTJ"
    | "ESTP"
    | "INFJ"
    | "INTJ"
    | "INTP"
    | "ISFJ"
    | "ISFP"
    | "ISTJ"
    | "ISTP"
    | null;
};

export const updateApplication = async (
  input: UpdateApplicationInput,
  actor: Actor,
) => {
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

    // Non-blocking: when a candidate moves into onboarding (hired), send the
    // onboarding welcome email with their position info. A missing EMAIL
    // binding or send failure must not fail the status update.
    if (status === "onboarding" && updatedApplication.status === "onboarding") {
      const [context] = await db
        .select({
          candidateEmail: candidate.email,
          candidateName: candidate.firstName,
          candidateLastName: candidate.lastName,
          candidateLocationCity: candidate.locationCity,
          candidateLocationState: candidate.locationState,
          positionName: position.name,
        })
        .from(application)
        .innerJoin(candidate, eq(candidate.id, application.candidateId))
        .innerJoin(position, eq(position.id, application.positionId))
        .where(eq(application.id, applicationId))
        .limit(1);

      if (context?.candidateEmail) {
        const sender = getServerEmailSender();
        if (sender) {
          sendMail({
            sender,
            to: context.candidateEmail,
            template: "onboarding-welcome",
            data: {
              candidateName:
                `${context.candidateName} ${context.candidateLastName}`.trim(),
              positionName: context.positionName,
              location:
                context.candidateLocationCity &&
                context.candidateLocationState
                  ? `${context.candidateLocationCity}, ${context.candidateLocationState}`
                  : context.candidateLocationCity ||
                    context.candidateLocationState ||
                    null,
              contactEmail: "people@darkalphacapital.com",
            },
          }).catch((error) =>
            console.error("Failed to send onboarding welcome email:", error),
          );
        }
      }
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
};

export type UpdateAiScreeningInput = {
  screeningId: string;
  candidateId: string;
  analysis: string;
  structuredData?: unknown | null;
};

export const updateAiScreening = async (
  input: UpdateAiScreeningInput,
  actor: Actor,
) => {
  const { screeningId, candidateId, analysis, structuredData } = input;

  if (!analysis || analysis.trim() === "") {
    return { error: "Analysis is required" };
  }

  try {
    // Get current screening data for audit log
    const [currentScreening] = await db
      .select()
      .from(candidateAiScreening)
      .where(eq(candidateAiScreening.id, screeningId))
      .limit(1);

    if (!currentScreening) {
      return { error: "AI screening not found" };
    }

    // Only update structuredData if explicitly provided
    const updateFields: {
      analysis: string;
      structuredData?: Record<string, unknown>;
      updatedAt: Date;
    } = {
      analysis: analysis.trim(),
      updatedAt: new Date(),
    };

    if (structuredData !== undefined) {
      updateFields.structuredData =
        structuredData as Record<string, unknown>;
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
          structuredData: structuredData || null,
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

    return { success: true, data: updatedScreening as any };
  } catch (error) {
    console.error("Error updating AI screening:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update AI screening",
    };
  }
};

export const deleteAiScreening = async (
  screeningId: string,
  candidateId: string,
  actor: Actor,
) => {
  try {
    // Get screening data before deletion for audit log
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
};
