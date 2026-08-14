import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  deleteScreener,
  getScreenerById,
} from "@workspace/db/repositories/screener-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const deleteScreenerAction = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    try {
      const screenerData = await getScreenerById(id);
      const deleted = await deleteScreener(id);

      if (!deleted) {
        return { error: "Screener not found" };
      }

      if (screenerData) {
        insertAuditLog({
          userId: session.user.id,
          action: "delete_screener",
          entityType: "screener",
          entityId: id,
          details: {
            screener: { id: screenerData.id, name: screenerData.name },
          },
        }).catch((error) => console.error("Audit log error:", error));
      }

      return { success: true };
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "Failed to delete screener" };
    }
  });
