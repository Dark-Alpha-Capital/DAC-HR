import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { positionsService } from "../positions-service";
import type { PositionFormSchema } from "../../schemas";

export const createPosition = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: PositionFormSchema) => data)
  .handler(async ({ data, context: { session } }) =>
    positionsService.create(data, session.user),
  );
