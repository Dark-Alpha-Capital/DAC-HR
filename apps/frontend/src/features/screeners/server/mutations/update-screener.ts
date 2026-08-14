import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { updateScreener } from "@workspace/db/repositories/screener-repository";
import {
  screenerEditSchema,
  type ScreenerEditSchema,
} from "#/features/screeners/schemas";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

type UpdateScreenerInput = ScreenerEditSchema & { id: string };

export const updateScreenerAction = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateScreenerInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { id, ...formData } = data;
    const result = screenerEditSchema.safeParse(formData);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const { name, content, positionId } = result.data;

    try {
      const updated = await updateScreener(id, {
        name,
        content,
        positionId: positionId?.trim() ? positionId : null,
      });

      if (!updated) {
        return { error: "Screener not found" };
      }

      insertAuditLog({
        userId: session.user.id,
        action: "update_screener",
        entityType: "screener",
        entityId: id,
        details: { screener: { id, name, positionId } },
      }).catch((error) => console.error("Audit log error:", error));

      return { data: updated };
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "Failed to update screener" };
    }
  });
