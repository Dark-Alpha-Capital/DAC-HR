import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { positionsService } from "../positions-service";

export const deletePosition = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) =>
    positionsService.delete(id, session.user),
  );
