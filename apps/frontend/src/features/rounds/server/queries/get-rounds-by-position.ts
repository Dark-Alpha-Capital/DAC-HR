import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { roundsService } from "../rounds-service";

export const getRoundsByPosition = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: positionId }) =>
    roundsService.getRoundsByPosition(positionId),
  );
