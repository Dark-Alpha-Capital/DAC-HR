import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { loadEmployeeDetail } from "./server/queries/employees";

export function employeeDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => loadEmployeeDetail({ data: { id } }),
  });
}
