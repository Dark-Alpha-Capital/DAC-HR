import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { updateScreener } from "@workspace/db/repositories/screener-repository";
import {
  screenerFormSchema,
  type ScreenerFormSchema,
} from "../schemas/screener-form-schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

type UpdateScreenerInput = ScreenerFormSchema & { id: string };

export const updateScreenerAction = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateScreenerInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { id, ...formData } = data;
    const result = screenerFormSchema.safeParse(formData);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const { name, content } = result.data;

    try {
      const updated = await updateScreener(id, { name, content });

      if (!updated) {
        return { error: "Screener not found" };
      }

      insertAuditLog({
        userId: session.user.id,
        action: "update_screener",
        entityType: "screener",
        entityId: id,
        details: { screener: { id, name } },
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
