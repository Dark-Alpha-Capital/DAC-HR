import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AttendanceDataTable } from "~/components/meet/attendance-data-table";
import { SyncAttendanceButton } from "~/components/meet/sync-attendance-button";
import AttendancePaginationControls from "~/components/attendance-pagination-controls";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { getStoredAttendance } from "~/lib/actions/sync-meet-attendance";
import { toOptionalString, toPageNumber } from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";
import { defineEntityQueries } from "~/lib/query/options";

const PAGE_SIZE = 50;

type StoredAttendanceData = Awaited<ReturnType<typeof getStoredAttendance>>;

function parseMeetingAttendanceSearch(search: Record<string, unknown>) {
  return {
    date: toOptionalString(search.date),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

type MeetingAttendanceSearch = ReturnType<
  typeof parseMeetingAttendanceSearch
>;

const storedAttendanceQueries = defineEntityQueries(
  queryKeys.attendance.stored,
  (deps: MeetingAttendanceSearch): Promise<StoredAttendanceData> =>
    getStoredAttendance({ data: deps }),
  { placeholderData: keepPreviousData },
);

export const Route = createFileRoute(
  "/_main/employees/attendance/meeting-attendance",
)({
  head: () => ({
    meta: [{ title: "Meeting Attendance" }],
  }),
  validateSearch: parseMeetingAttendanceSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseMeetingAttendanceSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(storedAttendanceQueries.options(search));
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isLoading, isFetching }: UseQueryResult<StoredAttendanceData> =
    useQuery(storedAttendanceQueries.options(search));

  if (isLoading && !data) {
    return <MeetingAttendancePending />;
  }

  if (!data) {
    return null;
  }

  const rows = data.rows ?? [];
  const error = data.error;
  const currentPage = data.page;
  const totalPages = data.totalPages;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const handleDateChange = (nextDate: string) => {
    void navigate({
      search: (current) => ({
        ...current,
        date: nextDate || undefined,
        page: undefined,
      }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Meeting Attendance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Firm-wide list of everyone who joined Meet calls across all
            accounts.
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

      <div className="flex flex-col gap-3 border border-border bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="attendance-date-filter"
            className="text-xs text-muted-foreground"
          >
            Filter by date
          </Label>
          <Input
            id="attendance-date-filter"
            type="date"
            className="w-auto bg-background"
            value={search.date ?? ""}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </div>
        {search.date ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleDateChange("")}
          >
            Show all dates
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {isFetching ? "Refreshing…" : `${data.total} attendee record${data.total === 1 ? "" : "s"}`}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <AttendanceDataTable data={rows} />

      <AttendancePaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        totalCount={data.total}
        pageItemCount={rows.length}
        limit={PAGE_SIZE}
      />
    </div>
  );
}
