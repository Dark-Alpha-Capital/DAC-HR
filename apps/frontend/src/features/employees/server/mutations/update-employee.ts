import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { updateEmployee as updateEmployeeService } from "#/features/employees/employees-service";
import {
  employeeFormSchema,
  type EmployeeFormSchema,
} from "#/features/employees/schemas";

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, EmployeeFormSchema]) => data)
  .handler(async ({ data: [employeeId, data], context: { session } }) => {
    const result = employeeFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    return updateEmployeeService(employeeId, result.data, session.user);
  });
