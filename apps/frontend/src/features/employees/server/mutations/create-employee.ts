import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { employeesService } from "../employees-service";
import type { EmployeeFormSchema } from "../../schemas";

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: EmployeeFormSchema) => data)
  .handler(async ({ data, context: { session } }) =>
    employeesService.create(data, session.user),
  );
