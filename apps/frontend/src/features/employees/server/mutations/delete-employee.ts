import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { deleteEmployee as deleteEmployeeService } from "#/features/employees/employees-service";

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    return deleteEmployeeService(id, session.user);
  });
