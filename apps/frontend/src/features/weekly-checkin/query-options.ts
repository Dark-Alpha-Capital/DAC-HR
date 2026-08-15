import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toPageNumber } from "#/lib/parse-search";
import { loadWeeklyCheckinRecords } from "./server/queries/weekly-checkin";

// Raw search params from the router. Values are unconstrained until parsed;
// `page` is narrowed by toPageNumber.
interface WeeklyCheckinRecordsSearchInput {
  page?: unknown;
}

export function parseWeeklyCheckinRecordsSearch(
  search: WeeklyCheckinRecordsSearchInput,
) {
  return {
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : undefined,
  };
}

export type WeeklyCheckinRecordsSearch = ReturnType<
  typeof parseWeeklyCheckinRecordsSearch
>;
export type WeeklyCheckinRecordsData = Awaited<
  ReturnType<typeof loadWeeklyCheckinRecords>
>;

export function weeklyCheckinRecordsQueryOptions(
  deps: WeeklyCheckinRecordsSearch,
) {
  return queryOptions({
    queryKey: queryKeys.weeklyCheckin.records(deps),
    queryFn: async (): Promise<WeeklyCheckinRecordsData> =>
      loadWeeklyCheckinRecords({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
