import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "#/lib/parse-search";
import {
  loadApplicationsIndex,
  loadApplicationDetail,
} from "./server/queries/applications";
import type { ApplicationDetailData } from "./types";

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toOptionalString / toStringArray / toPageNumber.
interface ApplicationsSearchInput {
  name?: unknown;
  email?: unknown;
  position?: unknown;
  status?: unknown;
  page?: unknown;
}

export function parseApplicationsSearch(search: ApplicationsSearchInput) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    position: toStringArray(search.position as string | string[] | undefined),
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    status: toStringArray(search.status as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : undefined,
  };
}

export type ApplicationsIndexSearch = ReturnType<
  typeof parseApplicationsSearch
>;
export type ApplicationsIndexData = Awaited<
  ReturnType<typeof loadApplicationsIndex>
>;

export function applicationsIndexQueryOptions(deps: ApplicationsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.applications.list(deps),
    queryFn: async (): Promise<ApplicationsIndexData> =>
      loadApplicationsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}

export function applicationDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.applications.detail(id),
    queryFn: async (): Promise<ApplicationDetailData> =>
      loadApplicationDetail({ data: id }),
  });
}
