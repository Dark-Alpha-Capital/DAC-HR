"use server";

import { db } from "@workspace/db";
import { interview, application } from "@workspace/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

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

    if (!newInterview) {
      return { error: "Failed to create interview" };
    }

    // Update application status to "interviewing" if it's still pending/reviewed
    if (app.status === "pending" || app.status === "reviewed") {
      await db
        .update(application)
        .set({ status: "interviewing" })
        .where(eq(application.id, applicationId));
    }

    updateTag(`interview-${newInterview.id}`);
    updateTag(`application-${applicationId}`);
    updateTag(`candidate-applications-${app.candidateId}`);
    revalidatePath(`/candidates/${app.candidateId}`);
    revalidatePath(`/applications/${applicationId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "create_interview",
        entityType: "interview",
        entityId: newInterview.id,
        details: {
          interview: {
            id: newInterview.id,
            applicationId: newInterview.applicationId,
            positionRoundTemplateId: newInterview.positionRoundTemplateId,
            interviewerId: newInterview.interviewerId,
            scheduledAt: newInterview.scheduledAt?.toISOString() || null,
            status: newInterview.status,
            createdAt: newInterview.createdAt.toISOString(),
          },
          input: {
            applicationId,
            positionRoundTemplateId,
            interviewerId,
            scheduledAt: scheduledAt
              ? new Date(scheduledAt).toISOString()
              : null,
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            applicationStatus: app.status,
          },
        },
      });
    });

    return { success: true, data: newInterview };
  } catch (error) {
    console.error("Error creating interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview" };
  }
};
