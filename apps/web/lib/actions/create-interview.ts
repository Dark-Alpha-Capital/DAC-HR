"use server";

import { db } from "@workspace/db";
import { interview, application } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export interface CreateInterviewInput {
  applicationId: string;
  positionRoundTemplateId: string;
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

  const { applicationId, positionRoundTemplateId, interviewerId, scheduledAt } =
    data;

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
        positionRoundTemplateId,
        interviewerId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "pending",
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
