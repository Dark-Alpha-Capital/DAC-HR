"use server";

import { db } from "@workspace/db";
import { interviewFeedback } from "@workspace/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq, and } from "@workspace/db";
import { getInterviewById } from "@workspace/db/queries";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

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
export const createInterviewFeedback = async (
  data: CreateInterviewFeedbackInput,
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { interviewId, questionId, notes, rating } = data;

  try {
    // Check if feedback already exists
    const [existing] = await db
      .select()
      .from(interviewFeedback)
      .where(
        and(
          eq(interviewFeedback.interviewId, interviewId),
          eq(interviewFeedback.questionId, questionId),
        ),
      )
      .limit(1);

    let result: typeof interviewFeedback.$inferSelect | undefined;
    if (existing) {
      // Update existing feedback
      [result] = await db
        .update(interviewFeedback)
        .set({
          notes: notes ?? null,
          rating: rating ?? null,
        })
        .where(eq(interviewFeedback.id, existing.id))
        .returning();
    } else {
      // Create new feedback
      [result] = await db
        .insert(interviewFeedback)
        .values({
          interviewId,
          questionId,
          notes: notes ?? null,
          rating: rating ?? null,
        })
        .returning();
    }

    const interview = await getInterviewById(interviewId);
    if (interview) {
      updateTag(`interview-${interviewId}`);
      updateTag(`application-${interview.applicationId}`);
      revalidatePath(`/interviews/${interviewId}`);
      revalidatePath(`/applications/${interview.applicationId}`);
    }

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: existing
          ? "update_interview_feedback"
          : "create_interview_feedback",
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
            isUpdate: !!existing,
          },
        },
      });
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating interview feedback", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview feedback" };
  }
};

/**
 * Creates or updates feedback for multiple questions at once
 */
export const bulkCreateInterviewFeedback = async (
  data: BulkCreateInterviewFeedbackInput,
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { interviewId, feedback } = data;

  try {
    const results: (typeof interviewFeedback.$inferSelect)[] = [];

    for (const item of feedback) {
      // Check if feedback already exists
      const [existing] = await db
        .select()
        .from(interviewFeedback)
        .where(
          and(
            eq(interviewFeedback.interviewId, interviewId),
            eq(interviewFeedback.questionId, item.questionId),
          ),
        )
        .limit(1);

      let result: typeof interviewFeedback.$inferSelect | undefined;
      if (existing) {
        // Update existing feedback
        [result] = await db
          .update(interviewFeedback)
          .set({
            notes: item.notes ?? null,
            rating: item.rating ?? null,
          })
          .where(eq(interviewFeedback.id, existing.id))
          .returning();
      } else {
        // Create new feedback
        [result] = await db
          .insert(interviewFeedback)
          .values({
            interviewId,
            questionId: item.questionId,
            notes: item.notes ?? null,
            rating: item.rating ?? null,
          })
          .returning();
      }
      if (result) {
        results.push(result);
      }
    }

    const interview = await getInterviewById(interviewId);
    if (interview) {
      updateTag(`interview-${interviewId}`);
      updateTag(`application-${interview.applicationId}`);
      revalidatePath(`/interviews/${interviewId}`);
      revalidatePath(`/applications/${interview.applicationId}`);
    }

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "bulk_create_interview_feedback",
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
      });
    });

    return { success: true, data: results };
  } catch (error) {
    console.error("Error bulk creating interview feedback", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview feedback" };
  }
};
