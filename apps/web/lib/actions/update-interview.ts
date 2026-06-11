import { defineAction } from "./create-action";
import { db } from "@workspace/db/db";
import { interview, application } from "@workspace/db/schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { getInterviewById } from "@workspace/db/repositories/interview-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export interface UpdateInterviewInput {
  interviewId: string;
  status?: "pending" | "move_forward" | "rejected" | "scheduled";
  scheduledAt?: Date | null;
  overallFeedback?: string;
  rating?: number; // Rating from 1 to 5
}

export const updateInterview = defineAction(async (data: UpdateInterviewInput) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { interviewId, status, scheduledAt, overallFeedback, rating } = data;

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
    if (app?.candidateId) {
    }
    insertAuditLog({
        userId: session.user.id,
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
            scheduledAt: scheduledAt
              ? new Date(scheduledAt).toISOString()
              : null,
            overallFeedback,
            rating,
          },
          updatedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
});
