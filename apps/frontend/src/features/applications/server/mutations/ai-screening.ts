import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  updateAiScreening as updateAiScreeningService,
  deleteAiScreening as deleteAiScreeningService,
  type UpdateAiScreeningInput,
} from "#/features/applications/applications-service";

export const updateAiScreening = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateAiScreeningInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return updateAiScreeningService(data, session.user);
  });

export const deleteAiScreening = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, string]) => data)
  .handler(async ({ data: [screeningId, candidateId], context: { session } }) => {
    return deleteAiScreeningService(screeningId, candidateId, session.user);
  });
