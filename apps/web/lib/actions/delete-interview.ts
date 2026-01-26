"use server";

import { db } from "@workspace/db";
import {
  interview,
  interviewFeedback,
  application,
} from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const deleteInterview = async (interviewId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

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

    // Invalidate caches
    updateTag(`interview-${interviewId}`);
    updateTag(`application-${existingInterview.applicationId}`);
    if (app?.candidateId) {
      updateTag(`candidate-applications-${app.candidateId}`);
      revalidatePath(`/candidates/${app.candidateId}`);
    }
    revalidatePath(`/applications/${existingInterview.applicationId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "delete_interview",
        entityType: "interview",
        entityId: interviewId,
        details: {
          deletedInterview: {
            id: existingInterview.id,
            applicationId: existingInterview.applicationId,
            positionRoundTemplateId: existingInterview.positionRoundTemplateId,
            interviewerId: existingInterview.interviewerId,
            status: existingInterview.status,
            rating: existingInterview.rating,
            scheduledAt: existingInterview.scheduledAt?.toISOString() || null,
            createdAt: existingInterview.createdAt.toISOString(),
          },
          deletedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete interview" };
  }
};
