import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { roundsService, type RoundEditData } from "../rounds-service";

export const updateRound = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, RoundEditData]) => data)
  .handler(async ({ data: [roundId, data], context: { session } }) =>
    roundsService.update(roundId, data, session.user),
  );
