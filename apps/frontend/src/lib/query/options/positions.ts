import { queryOptions } from "@tanstack/react-query";
import { loadPositionsIndex } from "~/lib/loaders/positions";
import { queryKeys } from "~/lib/query/query-keys";

export type PositionsIndexDeps = {
  hireLevel?: string[];
  status?: string[];
  page?: number;
};

export function positionsIndexQueryOptions(deps: PositionsIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.positions.list(deps),
    queryFn: () => loadPositionsIndex({ data: deps }),
  });
}
