"use server";

import { db } from "@workspace/db";
import { candidate } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleCandidateOnboarding(id: string, current: boolean) {
  await db
    .update(candidate)
    .set({ onboarding: !current })
    .where(eq(candidate.id, id));

  revalidatePath(`/candidates/${id}`);

  return { success: true };
}

