import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toPageNumber, toStringArray } from "#/lib/parse-search";
import { loadRoundsIndex } from "./server/queries/rounds";

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toStringArray / toPageNumber.
interface RoundsSearchInput {
  type?: unknown;
  page?: unknown;
}

export function parseRoundsSearch(search: RoundsSearchInput) {
  return {
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    type: toStringArray(search.type as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : undefined,
  };
}

export type RoundsIndexSearch = ReturnType<typeof parseRoundsSearch>;
export type RoundsIndexData = Awaited<ReturnType<typeof loadRoundsIndex>>;

export function roundsIndexQueryOptions(deps: RoundsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.rounds.list(deps),
    queryFn: async (): Promise<RoundsIndexData> =>
      loadRoundsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
