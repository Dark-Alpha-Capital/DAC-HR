"use server";

import { db } from "@workspace/db";
import { candidate, candidateOnboarding } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export async function toggleOnboardingTask(
  candidateId: string,
  taskKey: keyof typeof candidateOnboarding,
  value: boolean,
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
  },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

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

      if (!inserted) {
        return { success: false, error: "Failed to create onboarding record" };
      }

      revalidatePath(`/candidates/${candidateId}`);

      after(async () => {
        await insertAuditLog({
          userId: session.user.id,
          action: "create_onboarding",
          entityType: "candidate_onboarding",
          entityId: inserted.id,
          details: {
            onboarding: {
              id: inserted.id,
              candidateId: inserted.candidateId,
              contractSigned: inserted.contractSigned,
              emailProvided: inserted.emailProvided,
              onboardingPacketSent: inserted.onboardingPacketSent,
              companyEmailActivate: inserted.companyEmailActivate,
            },
            input: {
              candidateId,
              tasks,
            },
            createdBy: {
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

    if (!updated) {
      return { success: false, error: "Failed to update onboarding record" };
    }

    revalidatePath(`/candidates/${candidateId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "update_onboarding",
        entityType: "candidate_onboarding",
        entityId: updated.id,
        details: {
          onboarding: {
            id: updated.id,
            candidateId: updated.candidateId,
            contractSigned: updated.contractSigned,
            emailProvided: updated.emailProvided,
            onboardingPacketSent: updated.onboardingPacketSent,
            companyEmailActivate: updated.companyEmailActivate,
          },
          input: {
            candidateId,
            tasks,
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

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating onboarding tasks:", error);
    return { success: false, error: "Failed to update onboarding tasks" };
  }
}
