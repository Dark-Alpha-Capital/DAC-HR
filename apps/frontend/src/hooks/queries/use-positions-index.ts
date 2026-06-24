import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  positionsIndexQueryOptions,
  type PositionsIndexDeps,
} from "~/lib/query/options/positions";

export function usePositionsIndex(deps: PositionsIndexDeps) {
  return useQuery({
    ...positionsIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
