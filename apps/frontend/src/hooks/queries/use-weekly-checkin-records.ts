import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  weeklyCheckinRecordsQueryOptions,
  type WeeklyCheckinRecordsDeps,
} from "~/lib/query/options/weekly-checkin";

export function useWeeklyCheckinRecords(deps: WeeklyCheckinRecordsDeps) {
  return useQuery({
    ...weeklyCheckinRecordsQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
