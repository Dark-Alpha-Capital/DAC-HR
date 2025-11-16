"use server";

import { db } from "@workspace/db";
import { interview } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getInterviewById } from "@workspace/db/queries";

export interface UpdateInterviewInput {
  interviewId: string;
  status?: "pending" | "move_forward" | "rejected";
  scheduledAt?: Date | null;
  overallFeedback?: string;
  rating?: number; // Rating from 1 to 5
}

export const updateInterview = async (data: UpdateInterviewInput) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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

    revalidatePath(`/candidates/${currentInterview.applicationId}`);
    revalidatePath(`/applications/${currentInterview.applicationId}`);
    revalidatePath(`/interviews/${interviewId}`);

    return { success: true, data: updatedInterview };
  } catch (error) {
    console.error("Error updating interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update interview" };
  }
};
