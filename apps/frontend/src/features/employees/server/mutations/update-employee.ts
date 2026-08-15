import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { employeesService } from "../employees-service";
import type { EmployeeFormSchema } from "../../schemas";

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, EmployeeFormSchema]) => data)
  .handler(async ({ data: [employeeId, data], context: { session } }) =>
    employeesService.update(employeeId, data, session.user),
  );
