import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { roundsService } from "../rounds-service";

export const deleteRound = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) =>
    roundsService.delete(id, session.user),
  );
