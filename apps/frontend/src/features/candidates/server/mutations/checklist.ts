import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  updateChecklistItems as updateChecklistItemsService,
  type ChecklistItemInput,
} from "#/features/candidates/candidates-service";

export const updateChecklistItems = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, ChecklistItemInput[]]) => data)
  .handler(
    async ({ data: [candidateId, items], context: { session } }) => {
      return updateChecklistItemsService(candidateId, items, session.user);
    },
  );
