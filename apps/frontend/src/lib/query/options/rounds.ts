import { queryOptions } from "@tanstack/react-query";
import { loadRoundsIndex } from "~/lib/loaders/rounds";
import { queryKeys } from "~/lib/query/query-keys";

export type RoundsIndexDeps = {
  type?: string[];
  page?: number;
};

export function roundsIndexQueryOptions(deps: RoundsIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.rounds.list(deps),
    queryFn: () => loadRoundsIndex({ data: deps }),
  });
}
