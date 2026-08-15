import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Skeleton } from "#/components/ui/skeleton";
import { getMeetConferenceDetail } from "#/features/attendance/server/meet-attendance";
import { attendanceDetailQueryOptions } from "#/features/attendance/server/meet-attendance";
import type {
  MeetAttendanceParticipant,
  MeetParticipantKind,
} from "#/features/attendance/meet-attendance";
import { formatDateTime } from "#/lib/utils";

function formatDuration(ms: number | null) {
  if (ms === null || Number.isNaN(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function kindLabel(kind: MeetParticipantKind) {
  switch (kind) {
    case "signedin":
      return "Signed in";
    case "anonymous":
      return "Guest";
    case "phone":
      return "Phone";
    case "unknown":
      return "Unknown";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function ParticipantRow({
  participant,
}: {
  participant: MeetAttendanceParticipant;
}) {
  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {participant.displayName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {kindLabel(participant.kind)}
            {participant.userId ? ` · ${participant.userId}` : ""}
          </p>
        </div>
        <dl className="shrink-0 space-y-0.5 text-xs text-muted-foreground sm:text-right">
          <div>
            <dt className="inline">Duration: </dt>
            <dd className="inline font-medium text-foreground">
              {formatDuration(participant.totalDurationMs)}
            </dd>
          </div>
          <div>
            <dt className="inline">Joined: </dt>
            <dd className="inline">
              {formatDateTime(participant.earliestStartTime)}
            </dd>
          </div>
          <div>
            <dt className="inline">Left: </dt>
            <dd className="inline">
              {participant.latestEndTime
                ? formatDateTime(participant.latestEndTime)
                : "still in call"}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

export function AttendanceDetailPage() {
  const params = useParams({
    from: "/_main/employees/attendance/$conferenceId",
  });
  const {
    data,
    isLoading,
  }: UseQueryResult<Awaited<ReturnType<typeof getMeetConferenceDetail>>> =
    useQuery(attendanceDetailQueryOptions(params.conferenceId));

  const conference = data?.conference ?? null;
  const error = data?.error;

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground">
          <Link
            to="/employees/attendance"
            className="hover:text-foreground hover:underline"
          >
            ← Back to meetings
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {conference?.title ?? "Attendance"}
        </h1>
        {conference ? (
          <dl className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline font-medium text-foreground/80">Start: </dt>
              <dd className="inline">{formatDateTime(conference.startTime)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground/80">End: </dt>
              <dd className="inline">
                {conference.endTime
                  ? formatDateTime(conference.endTime)
                  : "still active / unknown"}
              </dd>
            </div>
            {conference.meetingCode ? (
              <div className="sm:col-span-2">
                <dt className="inline font-medium text-foreground/80">
                  Meet code:{" "}
                </dt>
                <dd className="inline font-mono">{conference.meetingCode}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      {isLoading ? <AttendanceDetailPending /> : null}

      {!isLoading && error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && !conference ? (
        <p className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Conference not found.
        </p>
      ) : null}

      {!isLoading && conference ? (
        <section className="border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold">Participants</h2>
            <Badge variant="secondary">
              {conference.participants.length} participant
              {conference.participants.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {conference.participants.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
              No participants found.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {conference.participants.map((participant) => (
                <ParticipantRow
                  key={participant.name || participant.displayName}
                  participant={participant}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export function AttendanceDetailPending() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading attendance">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
