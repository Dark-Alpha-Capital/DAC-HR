"use server";

import { db } from "@workspace/db";
import { candidate, candidateOnboarding } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleOnboardingTask(
  candidateId: string,
  taskKey: keyof typeof candidateOnboarding,
  value: boolean
) {
  const existing = await db
    .select()
    .from(candidateOnboarding)
    .where(eq(candidateOnboarding.candidateId, candidateId))
    .limit(1)
    .execute();

  if (existing.length === 0) {
    // Insert a new row if it doesn't exist
    const [inserted] = await db
      .insert(candidateOnboarding)
      .values({
        candidateId,
        [taskKey]: value,
      } as any)
      .returning()
      .execute();
    return inserted;
  }

  // Otherwise update existing row
  const [updated] = await db
    .update(candidateOnboarding)
    .set({ [taskKey]: value } as any)
    .where(eq(candidateOnboarding.candidateId, candidateId))
    .returning()
    .execute();

  return updated;
}

export async function updateOnboardingTasks(
  candidateId: string,
  tasks: {
    contractSigned: boolean;
    emailProvided: boolean;
    onboardingPacketSent: boolean;
    companyEmailActivate: boolean;
  }
) {
  try {
    const existing = await db
      .select()
      .from(candidateOnboarding)
      .where(eq(candidateOnboarding.candidateId, candidateId))
      .limit(1)
      .execute();

    if (existing.length === 0) {
      // Insert a new row if it doesn't exist
      const [inserted] = await db
        .insert(candidateOnboarding)
        .values({
          candidateId,
          contractSigned: tasks.contractSigned,
          emailProvided: tasks.emailProvided,
          onboardingPacketSent: tasks.onboardingPacketSent,
          companyEmailActivate: tasks.companyEmailActivate,
        })
        .returning()
        .execute();

      revalidatePath(`/candidates/${candidateId}`);
      return { success: true, data: inserted };
    }

    // Update existing row with all tasks at once
    const [updated] = await db
      .update(candidateOnboarding)
      .set({
        contractSigned: tasks.contractSigned,
        emailProvided: tasks.emailProvided,
        onboardingPacketSent: tasks.onboardingPacketSent,
        companyEmailActivate: tasks.companyEmailActivate,
      })
      .where(eq(candidateOnboarding.candidateId, candidateId))
      .returning()
      .execute();

    revalidatePath(`/candidates/${candidateId}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating onboarding tasks:", error);
    return { success: false, error: "Failed to update onboarding tasks" };
  }
}
