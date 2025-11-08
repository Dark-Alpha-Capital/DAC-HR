"use server";

import { db } from "@workspace/db";
import { application } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

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
  currentStage?: number;
}

export const updateApplication = async (data: UpdateApplicationInput) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { applicationId, status, currentStage } = data;

  try {
    const updateData: Partial<typeof application.$inferInsert> = {};
    if (status !== undefined) updateData.status = status;
    if (currentStage !== undefined) updateData.currentStage = currentStage;

    const [updatedApplication] = await db
      .update(application)
      .set(updateData)
      .where(eq(application.id, applicationId))
      .returning();

    // Revalidate relevant paths
    revalidatePath(`/candidates/${updatedApplication.candidateId}`);
    revalidatePath(`/applications/${applicationId}`);

    return { success: true, data: updatedApplication };
  } catch (error) {
    console.error("Error updating application", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update application" };
  }
};

