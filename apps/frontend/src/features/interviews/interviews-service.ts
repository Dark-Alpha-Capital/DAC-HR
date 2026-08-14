import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import {
  interview,
  interviewFeedback,
  application,
  candidate,
  position,
} from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createPositionInterviewBundle,
  deleteBundle,
  validatePositionRounds,
  type RoundConfig,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getInterviewById } from "@workspace/db/repositories/interview-repository";
import { getRoundsByPositionId } from "@workspace/db/modules/positions";
import { sendMail } from "@workspace/mail";
import {
  getServerEmailSender,
  getPublicBaseUrl,
} from "#/lib/server/email-sender";
import type { AgentConfig, RoundDeliveryMode } from "@workspace/db/enums";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type CreateInterviewInput = {
  applicationId: string;
  roundId: string;
  interviewerId: string;
  scheduledAt?: Date;
};

export const createInterview = async (input: CreateInterviewInput, actor: Actor) => {
  const { applicationId, roundId, interviewerId, scheduledAt } = input;

  try {
    // Get the application to verify it exists
    const [app] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!app) {
      return { error: "Application not found" };
    }

    // Create the interview
    const [newInterview] = await db
      .insert(interview)
      .values({
        applicationId,
        roundId,
        interviewerId,
        mode: "manual" as const,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "pending",
      })
      .returning();

    if (!newInterview) {
      return { error: "Failed to create interview" };
    }

    // Advance from AI screening when an interview is scheduled
    if (app.status === "ai_screening") {
      await db
        .update(application)
        .set({ status: "first_round" })
        .where(eq(application.id, applicationId));
    }
    insertAuditLog({
      userId: actor.id,
      action: "create_interview",
      entityType: "interview",
      entityId: newInterview.id,
      details: {
        interview: {
          id: newInterview.id,
          applicationId: newInterview.applicationId,
          roundId: newInterview.roundId,
          interviewerId: newInterview.interviewerId,
          scheduledAt: newInterview.scheduledAt?.toISOString() || null,
          status: newInterview.status,
          createdAt: newInterview.createdAt.toISOString(),
        },
        input: {
          applicationId,
          roundId,
          interviewerId,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          applicationStatus: app.status,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: newInterview };
  } catch (error) {
    console.error("Error creating interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview" };
  }
};

export type UpdateInterviewInput = {
  interviewId: string;
  status?: "pending" | "move_forward" | "rejected" | "scheduled";
  scheduledAt?: Date | null;
  overallFeedback?: string;
  rating?: number;
};

export const updateInterview = async (input: UpdateInterviewInput, actor: Actor) => {
  const { interviewId, status, scheduledAt, overallFeedback, rating } = input;

  try {
    // Get current interview to check application
    const currentInterview = await getInterviewById(interviewId);
    if (!currentInterview) {
      return { error: "Interview not found" };
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return { error: "Rating must be between 1 and 5" };
    }

    const updateData: Partial<typeof interview.$inferInsert> = {};
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined)
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (overallFeedback !== undefined)
      updateData.overallFeedback = overallFeedback;
    if (rating !== undefined) updateData.rating = rating;

    // Update the interview
    const [updatedInterview] = await db
      .update(interview)
      .set(updateData)
      .where(eq(interview.id, interviewId))
      .returning();

    if (!updatedInterview) {
      return { error: "Interview not found" };
    }

    // Get candidateId from application
    const [app] = await db
      .select({ candidateId: application.candidateId })
      .from(application)
      .where(eq(application.id, currentInterview.applicationId))
      .limit(1);

    insertAuditLog({
      userId: actor.id,
      action: "update_interview",
      entityType: "interview",
      entityId: updatedInterview.id,
      details: {
        interview: {
          id: updatedInterview.id,
          applicationId: updatedInterview.applicationId,
          status: updatedInterview.status,
          scheduledAt: updatedInterview.scheduledAt?.toISOString() || null,
          overallFeedback: updatedInterview.overallFeedback,
          rating: updatedInterview.rating,
        },
        input: {
          interviewId,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          overallFeedback,
          rating,
        },
        updatedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          previousStatus: currentInterview.status,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: updatedInterview };
  } catch (error) {
    console.error("Error updating interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update interview" };
  }
};

export const deleteInterview = async (interviewId: string, actor: Actor) => {
  try {
    // Get the interview to verify it exists and get application info
    const [existingInterview] = await db
      .select()
      .from(interview)
      .where(eq(interview.id, interviewId))
      .limit(1);

    if (!existingInterview) {
      return { error: "Interview not found" };
    }

    // Get the application to get candidateId for cache invalidation
    const [app] = await db
      .select()
      .from(application)
      .where(eq(application.id, existingInterview.applicationId))
      .limit(1);

    // Delete interview feedback first (foreign key constraint)
    await db
      .delete(interviewFeedback)
      .where(eq(interviewFeedback.interviewId, interviewId));

    // Delete the interview
    await db.delete(interview).where(eq(interview.id, interviewId));

    insertAuditLog({
      userId: actor.id,
      action: "delete_interview",
      entityType: "interview",
      entityId: interviewId,
      details: {
        deletedInterview: {
          id: existingInterview.id,
          applicationId: existingInterview.applicationId,
          roundId: existingInterview.roundId,
          interviewerId: existingInterview.interviewerId,
          status: existingInterview.status,
          rating: existingInterview.rating,
          scheduledAt: existingInterview.scheduledAt?.toISOString() || null,
          createdAt: existingInterview.createdAt.toISOString(),
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
    console.error("Error deleting interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete interview" };
  }
};

export type CreateInterviewSessionInput = {
  applicationId: string;
  roundConfigs?: RoundConfig[];
  expiryHours?: number;
  agentConfig?: AgentConfig;
};

export const createInterviewSession = async (
  input: CreateInterviewSessionInput,
  actor: Actor,
) => {
  const { applicationId, expiryHours = 72, agentConfig } = input;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  try {
    const [app] = await db
      .select({
        positionId: application.positionId,
        status: application.status,
        candidateEmail: candidate.email,
        candidateName: candidate.firstName,
        candidateLastName: candidate.lastName,
        positionName: position.name,
      })
      .from(application)
      .innerJoin(candidate, eq(candidate.id, application.candidateId))
      .innerJoin(position, eq(position.id, application.positionId))
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!app) {
      return { error: "Application not found" };
    }

    let roundConfigs = input.roundConfigs;

    if (!roundConfigs || roundConfigs.length === 0) {
      const positionRounds = await getRoundsByPositionId(app.positionId);
      roundConfigs = positionRounds.map((round) => ({
        roundId: round.id,
        deliveryMode: "form" as RoundDeliveryMode,
      }));
    }

    const validation = await validatePositionRounds(applicationId, roundConfigs);

    if (!validation.ok) {
      return { error: validation.error };
    }

    const result = await createPositionInterviewBundle({
      applicationId,
      roundConfigs,
      expiresAt,
      agentConfig,
    });

    if (app.status === "ai_screening") {
      await db
        .update(application)
        .set({ status: "first_round" })
        .where(eq(application.id, applicationId));
    }

    // Non-blocking: send the interview link to the candidate. A missing
    // EMAIL binding or a send failure must not fail link creation.
    if (app.candidateEmail) {
      const origin = getPublicBaseUrl();
      const sender = getServerEmailSender();
      if (sender) {
        sendMail({
          sender,
          to: app.candidateEmail,
          template: "interview-invite",
          data: {
            candidateName: `${app.candidateName} ${app.candidateLastName}`.trim(),
            positionName: app.positionName,
            interviewUrl: `${origin}/interview/${result.token}`,
            expiresAt: result.bundle.expiresAt,
          },
        }).catch((error) =>
          console.error("Failed to send interview invite email:", error),
        );
      }
    }

    insertAuditLog({
      userId: actor.id,
      action: "create_interview_bundle",
      entityType: "interview_bundle",
      entityId: result.bundle.id,
      details: {
        bundle: {
          id: result.bundle.id,
          applicationId,
          roundCount: result.bundleRounds.length,
          expiresAt: expiresAt.toISOString(),
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return {
      success: true,
      data: {
        bundleId: result.bundle.id,
        token: result.token,
        expiresAt: result.bundle.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error creating interview session:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview session" };
  }
};

export type CreateInterviewFeedbackInput = {
  interviewId: string;
  questionId: string;
  notes?: string;
  rating?: number;
};

export const createInterviewFeedback = async (
  input: CreateInterviewFeedbackInput,
  actor: Actor,
) => {
  const { interviewId, questionId, notes, rating } = input;

  try {
    const [result] = await db
      .insert(interviewFeedback)
      .values({
        interviewId,
        questionId,
        notes: notes ?? null,
        rating: rating ?? null,
      })
      .onConflictDoUpdate({
        target: [interviewFeedback.interviewId, interviewFeedback.questionId],
        set: {
          notes: notes ?? null,
          rating: rating ?? null,
        },
      })
      .returning();

    insertAuditLog({
      userId: actor.id,
      action: "upsert_interview_feedback",
      entityType: "interview_feedback",
      entityId: (result?.id as string) || "",
      details: {
        interviewFeedback: {
          id: result?.id || "",
          interviewId: result?.interviewId || "",
          questionId: result?.questionId || "",
          notes: result?.notes || "",
          rating: result?.rating || "",
        },
        input: {
          interviewId,
          questionId,
          notes: notes ?? null,
          rating: rating ?? null,
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          isUpsert: true,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating interview feedback", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview feedback" };
  }
};

export type BulkCreateInterviewFeedbackInput = {
  interviewId: string;
  feedback: Array<{
    questionId: string;
    notes?: string;
    rating?: number;
  }>;
};

export const bulkCreateInterviewFeedback = async (
  input: BulkCreateInterviewFeedbackInput,
  actor: Actor,
) => {
  const { interviewId, feedback } = input;

  try {
    const results = await db.transaction(async (tx) => {
      const upserted: (typeof interviewFeedback.$inferSelect)[] = [];
      for (const item of feedback) {
        const [result] = await tx
          .insert(interviewFeedback)
          .values({
            interviewId,
            questionId: item.questionId,
            notes: item.notes ?? null,
            rating: item.rating ?? null,
          })
          .onConflictDoUpdate({
            target: [interviewFeedback.interviewId, interviewFeedback.questionId],
            set: {
              notes: item.notes ?? null,
              rating: item.rating ?? null,
            },
          })
          .returning();

        if (result) {
          upserted.push(result);
        }
      }
      return upserted;
    });

    insertAuditLog({
      userId: actor.id,
      action: "bulk_upsert_interview_feedback",
      entityType: "interview_feedback",
      entityId: interviewId,
      details: {
        feedback: results.map((r) => ({
          id: r.id,
          interviewId: r.interviewId,
          questionId: r.questionId,
          notes: r.notes,
          rating: r.rating,
        })),
        input: {
          interviewId,
          feedback,
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          count: results.length,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: results };
  } catch (error) {
    console.error("Error bulk creating interview feedback", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview feedback" };
  }
};

export const removeInterviewBundle = async (bundleId: string, actor: Actor) => {
  try {
    await deleteBundle(bundleId);

    insertAuditLog({
      userId: actor.id,
      action: "delete_interview_bundle",
      entityType: "interview_bundle",
      entityId: bundleId,
      details: {
        deletedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview bundle:", error);
    return { error: "Failed to delete interview bundle" };
  }
};
