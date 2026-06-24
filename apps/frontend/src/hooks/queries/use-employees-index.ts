import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  employeesIndexQueryOptions,
  type EmployeesIndexDeps,
} from "~/lib/query/options/employees";

export function useEmployeesIndex(deps: EmployeesIndexDeps) {
  return useQuery({
    ...employeesIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
