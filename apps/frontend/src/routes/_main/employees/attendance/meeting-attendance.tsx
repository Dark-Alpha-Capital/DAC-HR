import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AttendanceDataTable } from "~/components/meet/attendance-data-table";
import { SyncAttendanceButton } from "~/components/meet/sync-attendance-button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Skeleton } from "~/components/ui/skeleton";
import { getStoredAttendance } from "~/lib/actions/sync-meet-attendance";
import { queryKeys } from "~/lib/query/query-keys";

function storedAttendanceQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.attendance.stored(),
    queryFn: async () => getStoredAttendance({ data: {} }),
  });
}

export const Route = createFileRoute(
  "/_main/employees/attendance/meeting-attendance",
)({
  head: () => ({
    meta: [{ title: "Meeting Attendance" }],
  }),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(storedAttendanceQueryOptions());
  },
  pendingComponent: MeetingAttendancePending,
  component: MeetingAttendancePage,
});

function MeetingAttendancePending() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading meeting attendance"
    >
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="mb-6 h-12 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function MeetingAttendancePage() {
  const {
    data,
    isLoading,
  }: UseQueryResult<Awaited<ReturnType<typeof getStoredAttendance>>> = useQuery(
    storedAttendanceQueryOptions(),
  );

  const rows = data?.rows ?? [];
  const error = data?.error;

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Meeting Attendance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Firm-wide list of everyone who joined Meet calls.
          </p>
          <p className="text-xs text-muted-foreground">
            Use{" "}
            <span className="font-medium text-foreground">
              Sync meeting attendance
            </span>{" "}
            to pull all available Meet history (~30 days) into this list. See{" "}
            <Link
              to="/employees/attendance"
              className="hover:text-foreground hover:underline"
            >
              Meetings
            </Link>{" "}
            for live conference records.
          </p>
        </div>
        <SyncAttendanceButton />
      </div>

      {isLoading ? <MeetingAttendancePending /> : null}

      {!isLoading && error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading ? <AttendanceDataTable data={rows} /> : null}
    </div>
  );
}
