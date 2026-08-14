import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  toggleOnboardingTask as toggleOnboardingTaskService,
  updateOnboardingTasks as updateOnboardingTasksService,
  type OnboardingTaskKey,
  type OnboardingTasks,
} from "#/features/candidates/candidates-service";

export const toggleOnboardingTask = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, OnboardingTaskKey, boolean]) => data)
  .handler(async ({ data: [candidateId, taskKey, value] }) => {
    return toggleOnboardingTaskService(candidateId, taskKey, value);
  });

export const updateOnboardingTasks = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, OnboardingTasks]) => data)
  .handler(
    async ({ data: [candidateId, tasks], context: { session } }) => {
      return updateOnboardingTasksService(candidateId, tasks, session.user);
    },
  );
