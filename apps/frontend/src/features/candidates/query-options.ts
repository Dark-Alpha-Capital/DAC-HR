import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { defineEntityQueries } from "#/lib/query/options";
import { toOptionalString, toPageNumber, toStringArray } from "#/lib/parse-search";
import { toCandidateSort, toCandidateView, type CandidateViewMode } from "./helpers";
import {
  loadCandidatesIndex,
  loadCandidateDetail,
} from "./server/queries/candidates";
import type { CandidatesIndexData } from "./server/candidates-service";

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toOptionalString / toStringArray / toPageNumber.
interface CandidatesSearchInput {
  name?: unknown;
  email?: unknown;
  position?: unknown;
  status?: unknown;
  source?: unknown;
  sort?: unknown;
  view?: unknown;
  page?: unknown;
}

export function parseCandidatesSearch(search: CandidatesSearchInput) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    position: toStringArray(search.position as string | string[] | undefined),
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    status: toStringArray(search.status as string | string[] | undefined),
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    source: toStringArray(search.source as string | string[] | undefined),
    sort: toCandidateSort(search.sort),
    view: toCandidateView(search.view),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : undefined,
  };
}

export type CandidatesIndexSearch = ReturnType<typeof parseCandidatesSearch>;
export type { CandidateViewMode };

export const candidatesIndexQueries = defineEntityQueries(
  queryKeys.candidates.list,
  (deps: CandidatesIndexSearch): Promise<CandidatesIndexData> =>
    loadCandidatesIndex({ data: deps }),
  { placeholderData: keepPreviousData },
);

export function candidateDetailQueryOptions(uid: string) {
  return queryOptions({
    queryKey: queryKeys.candidates.detail(uid),
    queryFn: async () => loadCandidateDetail({ data: { uid } }),
  });
}
