import { queryOptions } from "@tanstack/react-query";
import { loadWeeklyCheckinRecords } from "~/lib/loaders/weekly-checkin";
import { queryKeys } from "~/lib/query/query-keys";

export type WeeklyCheckinRecordsDeps = {
  page?: number;
};

export function weeklyCheckinRecordsQueryOptions(
  deps: WeeklyCheckinRecordsDeps,
) {
  return queryOptions({
    queryKey: queryKeys.weeklyCheckin.records(deps),
    queryFn: () => loadWeeklyCheckinRecords({ data: deps }),
  });
}
