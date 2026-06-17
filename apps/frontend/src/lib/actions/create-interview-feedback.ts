import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { interviewFeedback } from "@workspace/db/schema";
import { getSession } from "~/lib/middleware/auth-guard";
import { getInterviewById } from "@workspace/db/repositories/interview-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export interface CreateInterviewFeedbackInput {
  interviewId: string;
  questionId: string;
  notes?: string;
  rating?: number;
}

export interface BulkCreateInterviewFeedbackInput {
  interviewId: string;
  feedback: Array<{
    questionId: string;
    notes?: string;
    rating?: number;
  }>;
}

/**
 * Creates or updates feedback for a single question in an interview
 */
export const createInterviewFeedback = createServerFn({ method: "POST" })
  .validator((data: CreateInterviewFeedbackInput,) => data)
  .handler(async ({ data }) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { interviewId, questionId, notes, rating } = data;

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

    const interview = await getInterviewById(interviewId);
    if (interview) {
    }

    insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
});

/**
 * Creates or updates feedback for multiple questions at once
 */
export const bulkCreateInterviewFeedback = createServerFn({ method: "POST" })
  .validator((data: BulkCreateInterviewFeedbackInput,) => data)
  .handler(async ({ data }) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { interviewId, feedback } = data;

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

    const interview = await getInterviewById(interviewId);
    if (interview) {
    }

    insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
});
