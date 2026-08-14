import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { createEmployee as createEmployeeService } from "#/features/employees/employees-service";
import {
  employeeFormSchema,
  type EmployeeFormSchema,
} from "#/features/employees/schemas";

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: EmployeeFormSchema) => data)
  .handler(async ({ data, context: { session } }) => {
    const result = employeeFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    return createEmployeeService(result.data, session.user);
  });
