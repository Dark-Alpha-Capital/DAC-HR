import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { createScreener } from "@workspace/db/repositories/screener-repository";
import {
  screenerFormSchema,
  type ScreenerFormSchema,
} from "../schemas/screener-form-schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const createScreenerAction = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: ScreenerFormSchema) => data)
  .handler(async ({ data, context: { session } }) => {
    const result = screenerFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const { name, content } = result.data;

    try {
      const newScreener = await createScreener({
        name,
        content,
        createdBy: session.user.id,
      });

      if (!newScreener) {
        return { error: "Failed to create screener" };
      }

      insertAuditLog({
        userId: session.user.id,
        action: "create_screener",
        entityType: "screener",
        entityId: newScreener.id,
        details: {
          screener: { id: newScreener.id, name: newScreener.name },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { data: newScreener };
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "Failed to create screener" };
    }
  });
