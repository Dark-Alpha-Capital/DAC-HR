import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import {
  candidatesService,
  type ChecklistItemInput,
} from "../candidates-service";

export const updateChecklistItems = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, ChecklistItemInput[]]) => data)
  .handler(async ({ data: [candidateId, items], context: { session } }) =>
    candidatesService.updateChecklistItems(candidateId, items, session.user),
  );
