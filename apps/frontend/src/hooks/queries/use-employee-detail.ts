import { useQuery } from "@tanstack/react-query";
import { employeeDetailQueryOptions } from "~/lib/query/options/employees";

export function useEmployeeDetail(id: string) {
  return useQuery(employeeDetailQueryOptions(id));
}
