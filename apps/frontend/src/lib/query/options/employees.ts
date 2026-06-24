import { queryOptions } from "@tanstack/react-query";
import { loadEmployeeDetail, loadEmployeesIndex } from "~/lib/loaders/employees";
import { queryKeys } from "~/lib/query/query-keys";

export type EmployeesIndexDeps = {
  position?: string[];
  department?: string[];
  name?: string;
  email?: string;
  page?: number;
};

export function employeesIndexQueryOptions(deps: EmployeesIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.employees.list(deps),
    queryFn: () => loadEmployeesIndex({ data: deps }),
  });
}

export function employeeDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => loadEmployeeDetail({ data: { id } }),
  });
}
