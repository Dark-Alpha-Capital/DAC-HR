import {
  getMeetConferences,
  getMeetConferenceDetail,
  getStoredAttendance,
} from "./server/meet-attendance";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString, toPageNumber } from "#/lib/parse-search";
import { defineEntityQueries } from "#/lib/query/options";
import type { ConferencesSearch } from "#/features/attendance/conferences-search";
import { conferencesFilterInput } from "#/features/attendance/conferences-search";

export function meetingsQueryOptions(deps: ConferencesSearch) {
  return queryOptions({
    queryKey: queryKeys.attendance.meetings(deps),
    queryFn: async () =>
      getMeetConferences({ data: conferencesFilterInput(deps) }),
  });
}

export function attendanceDetailQueryOptions(conferenceId: string) {
  return queryOptions({
    queryKey: queryKeys.attendance.detail(conferenceId),
    queryFn: async () => getMeetConferenceDetail({ data: { conferenceId } }),
  });
}

const PAGE_SIZE = 50;

type StoredAttendanceData = Awaited<ReturnType<typeof getStoredAttendance>>;

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toOptionalString / toPageNumber.
interface MeetingAttendanceSearchInput {
  date?: unknown;
  page?: unknown;
}

export function parseMeetingAttendanceSearch(
  search: MeetingAttendanceSearchInput,
) {
  return {
    date: toOptionalString(search.date),
    page: search.page !== undefined ? toPageNumber(search.page) : undefined,
  };
}

export type MeetingAttendanceSearch = ReturnType<
  typeof parseMeetingAttendanceSearch
>;

export const storedAttendanceQueries = defineEntityQueries(
  queryKeys.attendance.stored,
  (deps: MeetingAttendanceSearch): Promise<StoredAttendanceData> =>
    getStoredAttendance({ data: deps }),
  { placeholderData: keepPreviousData },
);

export { PAGE_SIZE };
