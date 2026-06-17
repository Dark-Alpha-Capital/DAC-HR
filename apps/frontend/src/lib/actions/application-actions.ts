import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import {
  application,
  candidate,
  position,
  documents,
} from "@workspace/db/schema";
import { eq, inArray } from "@workspace/db";
import { getSession } from "~/lib/get-session";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import type { ApplicationStatus } from "@workspace/db/application-status";

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .validator((data: [string, ApplicationStatus]) => data)
  .handler(async ({ data: [applicationId, status] }) => {
  const session = await getSession();

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get current application data before update
    const [currentApplication] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    // Update the application status
    const [updatedApplication] = await db
      .update(application)
      .set({ status })
      .where(eq(application.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return { success: false, error: "Application not found" };
    }
    insertAuditLog({
        userId: session.user.id,
        action: "update_application_status",
        entityType: "application",
        entityId: applicationId,
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
          },
          previousStatus: currentApplication?.status || null,
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

    return { success: true, application: updatedApplication };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { success: false, error: "Failed to update application status" };
  }
});

/**
 * Get application by ID with related data
 */
export const getApplicationById = createServerFn({ method: "GET" })
  .validator((data: string) => data)
  .handler(async ({ data: applicationId }) => {
  try {
    const [applicationData] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!applicationData) {
      return { success: false, error: "Application not found" };
    }

    return { success: true, application: applicationData };
  } catch (error) {
    console.error("Error fetching application:", error);
    return { success: false, error: "Failed to fetch application" };
  }
});
