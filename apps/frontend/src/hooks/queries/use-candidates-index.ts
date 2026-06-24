import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  candidatesIndexQueryOptions,
  type CandidatesIndexDeps,
} from "~/lib/query/options/candidates";

export function useCandidatesIndex(deps: CandidatesIndexDeps) {
  return useQuery({
    ...candidatesIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
