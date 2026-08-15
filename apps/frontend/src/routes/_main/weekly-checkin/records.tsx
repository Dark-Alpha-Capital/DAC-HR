import { createFileRoute } from "@tanstack/react-router";
import {
  WeeklyCheckinRecordsPage,
  WeeklyCheckinRecordsPending,
} from "#/features/weekly-checkin/components/weekly-checkin-records-page";
import {
  parseWeeklyCheckinRecordsSearch,
  weeklyCheckinRecordsQueryOptions,
} from "#/features/weekly-checkin/query-options";

export const Route = createFileRoute("/_main/weekly-checkin/records")({
  head: () => ({
    meta: [{ title: "Weekly Check-in Records" }],
  }),
  validateSearch: parseWeeklyCheckinRecordsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseWeeklyCheckinRecordsSearch(location.search);
    await queryClient.ensureQueryData(weeklyCheckinRecordsQueryOptions(search));
  },
  pendingComponent: WeeklyCheckinRecordsPending,
  component: WeeklyCheckinRecordsPage,
});
