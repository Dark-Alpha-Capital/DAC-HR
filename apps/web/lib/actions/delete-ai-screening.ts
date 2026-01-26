"use server";

import { db } from "@workspace/db";
import { candidateAiScreening } from "@workspace/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const deleteAiScreening = async (
  screeningId: string,
  candidateId: string,
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get screening data before deletion for audit log
    const [screeningData] = await db
      .select()
      .from(candidateAiScreening)
      .where(eq(candidateAiScreening.id, screeningId))
      .limit(1);

    if (!screeningData) {
      return { error: "AI screening not found" };
    }

    await db
      .delete(candidateAiScreening)
      .where(eq(candidateAiScreening.id, screeningId));

    updateTag(`candidate-ai-screenings-${candidateId}`);
    updateTag(`candidate-${candidateId}`);
    revalidatePath(`/candidates/${candidateId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "delete_ai_screening",
        entityType: "candidate_ai_screening",
        entityId: screeningId,
        details: {
          aiScreening: {
            id: screeningData.id,
            candidateId: screeningData.candidateId,
            positionId: screeningData.positionId,
            applicationId: screeningData.applicationId,
            model: screeningData.model,
            createdAt: screeningData.createdAt.toISOString(),
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
    console.error("Error deleting AI screening:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete AI screening",
    };
  }
};
