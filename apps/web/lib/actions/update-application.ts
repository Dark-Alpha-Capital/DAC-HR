"use server";

import { db } from "@workspace/db";
import { application } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { updateApplicationStatus } from "@workspace/db/queries";

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
    let updatedApplication;

    if (status !== undefined && status === "hired") {
      // Use the new function that handles employee creation
      updatedApplication = await updateApplicationStatus(applicationId, status);
      
      // If personality is also being updated, apply it
      if (personality !== undefined) {
        [updatedApplication] = await db
          .update(application)
          .set({ personality })
          .where(eq(application.id, applicationId))
          .returning();
      }
    } else {
      const updateData: Partial<typeof application.$inferInsert> = {};
      if (status !== undefined) updateData.status = status;
      if (personality !== undefined) updateData.personality = personality;

      [updatedApplication] = await db
        .update(application)
        .set(updateData)
        .where(eq(application.id, applicationId))
        .returning();
    }

    if (updatedApplication?.candidateId) {
      revalidatePath(`/candidates/${updatedApplication.candidateId}`);
    }
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
