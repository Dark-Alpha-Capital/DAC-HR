import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";

import { ConferencesList } from "~/components/meet/conferences-list";
import {
  MeetingsFilters,
  activeConferenceFilter,
  conferencesFilterInput,
  parseConferencesSearch,
  type ConferencesSearch,
} from "~/components/meet/meetings-filters";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { getMeetConferences } from "~/lib/actions/sync-meet-attendance";
import { queryKeys } from "~/lib/query/query-keys";

function meetingsQueryOptions(deps: ConferencesSearch) {
  return queryOptions({
    queryKey: queryKeys.attendance.meetings(deps),
    queryFn: async () =>
      getMeetConferences({ data: conferencesFilterInput(deps) }),
  });
}

export const Route = createFileRoute("/_main/employees/attendance/")({
  head: () => ({
    meta: [{ title: "Meetings" }],
  }),
  validateSearch: parseConferencesSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    await queryClient.ensureQueryData(meetingsQueryOptions(deps));
  },
  pendingComponent: MeetingsPending,
  component: MeetingsPage,
});

function MeetingsPending() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading meetings">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="mb-6 h-20 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function MeetingsPage() {
  const search = Route.useSearch();
  const { session } = Route.useRouteContext();
  const {
    data,
    isLoading,
  }: UseQueryResult<Awaited<ReturnType<typeof getMeetConferences>>> = useQuery(
    meetingsQueryOptions(search),
  );

  const emptyMessage =
    activeConferenceFilter(search) === "date" && search.date
      ? `No conference records found for ${search.date}.`
      : "No recent conference records found (or none within the 30-day retention window).";

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.user.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Recent Google Meet conferences (~30-day retention). Open a meeting
            for attendance.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link
            to="/employees/attendance/meeting-attendance"
            search={{} as any}
          >
            <CalendarCheck className="size-4 mr-2" />
            Meeting Attendance
          </Link>
        </Button>
      </div>

      <MeetingsFilters search={search} from="/employees/attendance/" />

      {isLoading ? <MeetingsPending /> : null}

      {!isLoading && data?.error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && data?.calendarScopeMissing ? (
        <Alert className="mb-4">
          <AlertDescription>
            Calendar access is missing, so meeting titles may show as meeting
            codes. Sign out and sign in again to grant Calendar permission.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && data ? (
        <ConferencesList
          conferences={data.conferences}
          emptyMessage={emptyMessage}
        />
      ) : null}
    </div>
  );
}
