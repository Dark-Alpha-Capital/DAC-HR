import { createFileRoute } from "@tanstack/react-router";
import { AttendanceDetailPage, AttendanceDetailPending } from "#/features/attendance/components/attendance-detail-page";
import { attendanceDetailQueryOptions } from "#/features/attendance/query-options";

export const Route = createFileRoute(
  "/_main/employees/attendance/$conferenceId",
)({
  head: () => ({
    meta: [{ title: "Attendance" }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(attendanceDetailQueryOptions(params.conferenceId));
  },
  pendingComponent: AttendanceDetailPending,
  component: AttendanceDetailPage,
});
