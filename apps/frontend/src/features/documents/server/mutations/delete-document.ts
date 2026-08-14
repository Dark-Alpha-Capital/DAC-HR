import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { deleteDocument as deleteDocumentService } from "#/features/documents/documents-service";

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    return deleteDocumentService(id, session.user);
  });
