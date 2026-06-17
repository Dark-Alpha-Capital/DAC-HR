import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { application } from "@workspace/db/schema";
import { getSession } from "~/lib/get-session";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import type { ApplicationStatus } from "@workspace/db/application-status";

export interface UpdateApplicationInput {
  applicationId: string;
  status?: ApplicationStatus;
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

export const updateApplication = createServerFn({ method: "POST" })
  .validator((data: UpdateApplicationInput) => data)
  .handler(async ({ data }) => {
  const session = await getSession();

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
    if (updatedApplication.candidateId) {
    }
    insertAuditLog({
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
      }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: updatedApplication };
  } catch (error) {
    console.error("Error updating application", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update application" };
  }
});
