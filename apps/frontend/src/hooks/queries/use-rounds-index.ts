import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  roundsIndexQueryOptions,
  type RoundsIndexDeps,
} from "~/lib/query/options/rounds";

export function useRoundsIndex(deps: RoundsIndexDeps) {
  return useQuery({
    ...roundsIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
