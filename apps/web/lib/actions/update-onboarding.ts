import { defineArgsAction } from "./create-action";
import { db } from "@workspace/db/db";
import { candidateOnboarding } from "@workspace/db/schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

type OnboardingTaskKey =
  | "contractSigned"
  | "emailProvided"
  | "onboardingPacketSent"
  | "companyEmailActivate";

const buildTaskUpdate = (
  taskKey: OnboardingTaskKey,
  value: boolean,
): Pick<
  typeof candidateOnboarding.$inferInsert,
  | "contractSigned"
  | "emailProvided"
  | "onboardingPacketSent"
  | "companyEmailActivate"
> => {
  switch (taskKey) {
    case "contractSigned":
      return { contractSigned: value };
    case "emailProvided":
      return { emailProvided: value };
    case "onboardingPacketSent":
      return { onboardingPacketSent: value };
    case "companyEmailActivate":
      return { companyEmailActivate: value };
  }
};

export const toggleOnboardingTask = defineArgsAction(async (
  candidateId: string,
  taskKey: OnboardingTaskKey,
  value: boolean,
) => {
  const [upserted] = await db
    .insert(candidateOnboarding)
    .values({
      candidateId,
      ...buildTaskUpdate(taskKey, value),
    })
    .onConflictDoUpdate({
      target: candidateOnboarding.candidateId,
      set: buildTaskUpdate(taskKey, value),
    })
    .returning()
    .execute();

  return upserted;
});

export const updateOnboardingTasks = defineArgsAction(async (
  candidateId: string,
  tasks: {
    contractSigned: boolean;
    emailProvided: boolean;
    onboardingPacketSent: boolean;
    companyEmailActivate: boolean;
  },
) => {
  const session = await getSession();

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [upserted] = await db
      .insert(candidateOnboarding)
      .values({
        candidateId,
        contractSigned: tasks.contractSigned,
        emailProvided: tasks.emailProvided,
        onboardingPacketSent: tasks.onboardingPacketSent,
        companyEmailActivate: tasks.companyEmailActivate,
      })
      .onConflictDoUpdate({
        target: candidateOnboarding.candidateId,
        set: {
          contractSigned: tasks.contractSigned,
          emailProvided: tasks.emailProvided,
          onboardingPacketSent: tasks.onboardingPacketSent,
          companyEmailActivate: tasks.companyEmailActivate,
        },
      })
      .returning()
      .execute();

    if (!upserted) {
      return { success: false, error: "Failed to update onboarding record" };
    }
    insertAuditLog({
        userId: session.user.id,
        action: "upsert_onboarding",
        entityType: "candidate_onboarding",
        entityId: upserted.id,
        details: {
          onboarding: {
            id: upserted.id,
            candidateId: upserted.candidateId,
            contractSigned: upserted.contractSigned,
            emailProvided: upserted.emailProvided,
            onboardingPacketSent: upserted.onboardingPacketSent,
            companyEmailActivate: upserted.companyEmailActivate,
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
      }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: upserted };
  } catch (error) {
    console.error("Error updating onboarding tasks:", error);
    return { success: false, error: "Failed to update onboarding tasks" };
  }
});
