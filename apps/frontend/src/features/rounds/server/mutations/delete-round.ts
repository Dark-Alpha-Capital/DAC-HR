import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { deleteRound as deleteRoundService } from "#/features/rounds/rounds-service";

export const deleteRound = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    if (session.user.role !== "admin") {
      return { error: "Only admins are allowed to delete rounds" };
    }

    return deleteRoundService(id, session.user);
  });
