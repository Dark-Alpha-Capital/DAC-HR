"use server";

import { db } from "@workspace/db";
import { candidateAiScreening } from "@workspace/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export interface UpdateAiScreeningInput {
  screeningId: string;
  candidateId: string;
  analysis: string;
  structuredData?: unknown | null; // Allow any structure to preserve existing data
}

export const updateAiScreening = async (data: UpdateAiScreeningInput) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { screeningId, candidateId, analysis, structuredData } = data;

  if (!analysis || analysis.trim() === "") {
    return { error: "Analysis is required" };
  }

  try {
    // Get current screening data for audit log
    const [currentScreening] = await db
      .select()
      .from(candidateAiScreening)
      .where(eq(candidateAiScreening.id, screeningId))
      .limit(1);

    if (!currentScreening) {
      return { error: "AI screening not found" };
    }

    // Only update structuredData if explicitly provided
    const updateFields: {
      analysis: string;
      structuredData?: unknown;
      updatedAt: Date;
    } = {
      analysis: analysis.trim(),
      updatedAt: new Date(),
    };

    if (structuredData !== undefined) {
      updateFields.structuredData = structuredData;
    }

    const [updatedScreening] = await db
      .update(candidateAiScreening)
      .set(updateFields)
      .where(eq(candidateAiScreening.id, screeningId))
      .returning();

    if (!updatedScreening) {
      return { error: "Failed to update AI screening" };
    }

    updateTag(`candidate-ai-screenings-${candidateId}`);
    updateTag(`candidate-${candidateId}`);
    revalidatePath(`/candidates/${candidateId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "update_ai_screening",
        entityType: "candidate_ai_screening",
        entityId: updatedScreening.id,
        details: {
          aiScreening: {
            id: updatedScreening.id,
            candidateId: updatedScreening.candidateId,
            positionId: updatedScreening.positionId,
            applicationId: updatedScreening.applicationId,
            model: updatedScreening.model,
            updatedAt: updatedScreening.updatedAt.toISOString(),
          },
          input: {
            analysis: analysis.trim(),
            structuredData: structuredData || null,
          },
          previous: {
            analysis: currentScreening.analysis,
            structuredData: currentScreening.structuredData,
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

    return { success: true, data: updatedScreening };
  } catch (error) {
    console.error("Error updating AI screening:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update AI screening",
    };
  }
};
