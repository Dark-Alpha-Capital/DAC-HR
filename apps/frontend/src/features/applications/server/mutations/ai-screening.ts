import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import {
  applicationsService,
  type UpdateAiScreeningInput,
} from "../applications-service";

export const updateAiScreening = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateAiScreeningInput) => data)
  .handler(async ({ data, context: { session } }) =>
    applicationsService.updateAiScreening(data, session.user),
  );

export const deleteAiScreening = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, string]) => data)
  .handler(
    async ({ data: [screeningId, candidateId], context: { session } }) =>
      applicationsService.deleteAiScreening(
        screeningId,
        candidateId,
        session.user,
      ),
  );
