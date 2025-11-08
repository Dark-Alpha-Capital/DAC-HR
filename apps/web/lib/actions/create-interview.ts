"use server";

import { db } from "@workspace/db";
import { interview, application } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getPositionRoundTemplateByStage } from "@workspace/db/queries";
import { eq } from "drizzle-orm";

export interface CreateInterviewInput {
  applicationId: string;
  interviewerId: string;
  scheduledAt?: Date;
}

export const createInterview = async (data: CreateInterviewInput) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { applicationId, interviewerId, scheduledAt } = data;

  try {
    // Get the application to find current stage and position
    const [app] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!app) {
      return { error: "Application not found" };
    }

    // Get the positionRoundTemplate for the current stage
    const positionRoundTemplate = await getPositionRoundTemplateByStage(
      app.positionId,
      app.currentStage
    );

    if (!positionRoundTemplate) {
      return {
        error: `No round template found for stage ${app.currentStage} of this position`,
      };
    }

    // Create the interview
    const [newInterview] = await db
      .insert(interview)
      .values({
        applicationId,
        positionRoundTemplateId: positionRoundTemplate.id,
        interviewerId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "scheduled",
      })
      .returning();

    // Update application status to "interviewing" if it's still pending/reviewed
    if (app.status === "pending" || app.status === "reviewed") {
      await db
        .update(application)
        .set({ status: "interviewing" })
        .where(eq(application.id, applicationId));
    }

    revalidatePath(`/candidates/${app.candidateId}`);
    revalidatePath(`/applications/${applicationId}`);

    return { success: true, data: newInterview };
  } catch (error) {
    console.error("Error creating interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview" };
  }
};

