import { queryOptions } from "@tanstack/react-query";
import type { CandidateSortOption } from "@workspace/db/candidate-list-filters";
import {
  loadCandidateDetail,
  loadCandidatesIndex,
  type CandidateDetailData,
} from "~/lib/loaders/candidates";
import { queryKeys } from "~/lib/query/query-keys";

export type CandidatesIndexDeps = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  source?: string[];
  sort?: CandidateSortOption;
  page?: number;
  view?: "table" | "kanban";
};

export function candidatesIndexQueryOptions(deps: CandidatesIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.candidates.list(deps),
    queryFn: () => loadCandidatesIndex({ data: deps }),
  });
}

export function candidateDetailQueryOptions(uid: string) {
  return queryOptions({
    queryKey: queryKeys.candidates.detail(uid),
    queryFn: async () =>
      (await loadCandidateDetail({ data: { uid } })) as CandidateDetailData,
  });
}
