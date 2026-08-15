import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { documentsService } from "../documents-service";

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) =>
    documentsService.delete(id, session.user),
  );
