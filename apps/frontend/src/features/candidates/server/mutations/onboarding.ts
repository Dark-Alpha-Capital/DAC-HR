import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import {
  candidatesService,
  type OnboardingTaskKey,
  type OnboardingTasks,
} from "../candidates-service";

export const toggleOnboardingTask = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, OnboardingTaskKey, boolean]) => data)
  .handler(async ({ data: [candidateId, taskKey, value] }) =>
    candidatesService.toggleOnboardingTask(candidateId, taskKey, value),
  );

export const updateOnboardingTasks = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, OnboardingTasks]) => data)
  .handler(async ({ data: [candidateId, tasks], context: { session } }) =>
    candidatesService.updateOnboardingTasks(candidateId, tasks, session.user),
  );
