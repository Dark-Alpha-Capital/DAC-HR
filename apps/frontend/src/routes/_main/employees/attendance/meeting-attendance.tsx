import { createFileRoute } from "@tanstack/react-router";
import { MeetingAttendancePage, MeetingAttendancePending } from "#/features/attendance/components/meeting-attendance-page";
import { parseMeetingAttendanceSearch, storedAttendanceQueries } from "#/features/attendance/query-options";

export const Route = createFileRoute(
  "/_main/employees/attendance/meeting-attendance",
)({
  head: () => ({
    meta: [{ title: "Meeting Attendance" }],
  }),
  validateSearch: parseMeetingAttendanceSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseMeetingAttendanceSearch(location.search);
    await queryClient.query({
      ...storedAttendanceQueries.options(search),
      staleTime: "static",
    });
  },
  pendingComponent: MeetingAttendancePending,
  component: MeetingAttendancePage,
});
