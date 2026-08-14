import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { deletePosition as deletePositionService } from "#/features/positions/positions-service";

export const deletePosition = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    if (session.user.role !== "admin") {
      return { error: "Only admins are allowed to delete positions" };
    }

    return deletePositionService(id, session.user);
  });
