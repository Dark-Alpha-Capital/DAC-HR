"use server";

import { db } from "@workspace/db";
import { application } from "@workspace/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export interface UpdateApplicationInput {
  applicationId: string;
  status?:
    | "pending"
    | "reviewed"
    | "shortlisted"
    | "interviewing"
    | "hired"
    | "rejected"
    | "withdrawn";
  personality?:
    | "ENFJ"
    | "ENFP"
    | "ENTJ"
    | "ENTP"
    | "ESFJ"
    | "ESFP"
    | "ESTJ"
    | "ESTP"
    | "INFJ"
    | "INTJ"
    | "INTP"
    | "ISFJ"
    | "ISFP"
    | "ISTJ"
    | "ISTP"
    | null;
}

export const updateApplication = async (data: UpdateApplicationInput) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { applicationId, status, personality } = data;

  try {
    const updateData: Partial<typeof application.$inferInsert> = {};
    if (status !== undefined) updateData.status = status;
    if (personality !== undefined) updateData.personality = personality;

    const [updatedApplication] = await db
      .update(application)
      .set(updateData)
      .where(eq(application.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return { error: "Application not found" };
    }

    updateTag(`application-${applicationId}`);
    if (updatedApplication.candidateId) {
      updateTag(`candidate-applications-${updatedApplication.candidateId}`);
      revalidatePath(`/candidates/${updatedApplication.candidateId}`);
    }
    revalidatePath(`/applications/${applicationId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "update_application",
        entityType: "application",
        entityId: updatedApplication.id,
        details: {
          application: {
            id: updatedApplication.id,
            candidateId: updatedApplication.candidateId,
            positionId: updatedApplication.positionId,
            status: updatedApplication.status,
            personality: updatedApplication.personality,
            updatedAt: updatedApplication.updatedAt.toISOString(),
          },
          input: {
            applicationId,
            status,
            personality,
          },
          updatedBy: {
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

    return { success: true, data: updatedApplication };
  } catch (error) {
    console.error("Error updating application", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update application" };
  }
};
