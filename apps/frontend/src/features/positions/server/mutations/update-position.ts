import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { positionsService } from "../positions-service";
import type { PositionFormSchema } from "../../schemas";

export const updatePosition = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, PositionFormSchema]) => data)
  .handler(async ({ data: [positionId, data], context: { session } }) =>
    positionsService.update(positionId, data, session.user),
  );
