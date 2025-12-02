"use server";

import { db } from "@workspace/db";
import { candidate, candidateOnboarding } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type OnboardingTaskKey = "contractSigned" | "emailProvided" | "onboardingPacketSent";


export async function toggleCandidateOnboarding(id: string, current: boolean) {
  await db
    .update(candidate)
    .set({ onboarding: !current })
    .where(eq(candidate.id, id));

  revalidatePath(`/candidates/${id}`);

  return { success: true };
}

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


