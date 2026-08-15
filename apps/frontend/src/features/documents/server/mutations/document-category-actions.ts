import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { documentsService } from "../documents-service";

export const createCategory = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, string | undefined]) => data)
  .handler(async ({ data: [name, description], context: { session } }) =>
    documentsService.createCategory(session.user, name, description),
  );

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, string, string | undefined]) => data)
  .handler(
    async ({ data: [id, name, description], context: { session } }) =>
      documentsService.updateCategory(session.user, id, name, description),
  );

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) =>
    documentsService.deleteCategory(session.user, id),
  );

export const getAllCategories = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(() => documentsService.listCategories());
