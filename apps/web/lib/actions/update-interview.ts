"use server";

import { db } from "@workspace/db";
import { interview, application } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getInterviewById, getApplicationById } from "@workspace/db/queries";

export interface UpdateInterviewInput {
  interviewId: string;
  status?: "scheduled" | "completed" | "cancelled";
  scheduledAt?: Date | null;
  overallFeedback?: string;
  advanceStage?: boolean; // If true, advance application to next stage after completion
}

export const updateInterview = async (data: UpdateInterviewInput) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { interviewId, status, scheduledAt, overallFeedback, advanceStage } =
    data;

  try {
    // Get current interview to check application
    const currentInterview = await getInterviewById(interviewId);
    if (!currentInterview) {
      return { error: "Interview not found" };
    }

    const updateData: Partial<typeof interview.$inferInsert> = {};
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined)
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (overallFeedback !== undefined)
      updateData.overallFeedback = overallFeedback;

    // Update the interview
    const [updatedInterview] = await db
      .update(interview)
      .set(updateData)
      .where(eq(interview.id, interviewId))
      .returning();

    // If interview is completed and advanceStage is true, advance to next stage
    let app = null;
    if (status === "completed" && advanceStage) {
      app = await getApplicationById(currentInterview.applicationId);
      if (app) {
        // Find the next stage
        const nextStage = app.rounds.find(
          (round) => round.stageOrder === app.currentStage + 1
        );

        if (nextStage) {
          // Advance to next stage
          await db
            .update(application)
            .set({ currentStage: app.currentStage + 1 })
            .where(eq(application.id, currentInterview.applicationId));
        } else {
          // No more stages, mark as completed (you might want to set status to "hired" or similar)
          // For now, we'll keep it as "interviewing" but you can customize this
        }
      }
    }

    // Get app for revalidation if we didn't already
    if (!app) {
      app = await getApplicationById(currentInterview.applicationId);
    }

    revalidatePath(`/candidates/${app?.candidateId || ""}`);
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

