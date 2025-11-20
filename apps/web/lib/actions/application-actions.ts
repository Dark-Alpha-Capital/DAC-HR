"use server";

import { db } from "@workspace/db";
import {
  application,
  candidate,
  position,
  documents,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  status: ApplicationStatus
) {
  try {
    // Update the application status
    const [updatedApplication] = await db
      .update(application)
      .set({ status })
      .where(eq(application.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return { success: false, error: "Application not found" };
    }

    revalidatePath(`/applications/${applicationId}`);
    revalidatePath(`/candidates/[uid]`, "page");

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
