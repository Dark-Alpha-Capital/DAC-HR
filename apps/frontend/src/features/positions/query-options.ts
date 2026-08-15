import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "#/lib/parse-search";
import { loadPositionsIndex } from "./server/queries/positions";

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toOptionalString / toStringArray / toPageNumber.
interface PositionsSearchInput {
  search?: unknown;
  hireLevel?: unknown;
  status?: unknown;
  page?: unknown;
}

export function parsePositionsSearch(search: PositionsSearchInput) {
  return {
    search: toOptionalString(search.search) ?? "",
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    hireLevel: toStringArray(search.hireLevel as string | string[] | undefined),
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    status: toStringArray(search.status as string | string[] | undefined),
    page: search.page !== undefined ? toPageNumber(search.page) : undefined,
  };
}

export type PositionsIndexSearch = ReturnType<typeof parsePositionsSearch>;
export type PositionsIndexData = Awaited<ReturnType<typeof loadPositionsIndex>>;

export function positionsIndexQueryOptions(deps: PositionsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.positions.list(deps),
    queryFn: async (): Promise<PositionsIndexData> =>
      loadPositionsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
