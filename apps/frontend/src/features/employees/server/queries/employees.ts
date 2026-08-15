import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { employeesService } from "../employees-service";

type EmployeesIndexInput = {
  position?: string[];
  department?: string[];
  name?: string;
  email?: string;
  page?: number;
};

export const loadEmployeesIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: EmployeesIndexInput) => data)
  .handler(async ({ data: deps }) => employeesService.list(deps));

export const loadEmployeeDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => employeesService.getDetail(data.id));

export const loadEmployeeNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { candidateId?: string; applicationId?: string }) => data)
  .handler(async ({ data }) => employeesService.getNewOptions(data));

export const loadEmployeeEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => employeesService.getEditOptions(data.id));
