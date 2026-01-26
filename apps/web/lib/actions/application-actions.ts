"use server";

import { db } from "@workspace/db";
import {
  application,
  candidate,
  position,
  documents,
} from "@workspace/db/schema";
import { eq, inArray } from "@workspace/db";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "interviewing"
  | "hired"
  | "rejected"
  | "withdrawn";

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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

    updateTag(`application-${applicationId}`);
    updateTag(`candidate-applications-${updatedApplication.candidateId}`);
    revalidatePath(`/applications/${applicationId}`);
    revalidatePath(`/candidates/${updatedApplication.candidateId}`);

    after(async () => {
      await insertAuditLog({
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
      });
    });

    return { success: true, application: updatedApplication };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { success: false, error: "Failed to update application status" };
  }
}

/**
 * Get application by ID with related data
 */
export async function getApplicationById(applicationId: string) {
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
}
