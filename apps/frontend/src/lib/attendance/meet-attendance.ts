/**
 * Google Meet API v2 + Calendar title matching.
 * Ported from dac-googlemeet (fetch core only — no Meet-only D1 schema).
 */

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const MEET_API = "https://meet.googleapis.com/v2";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const ATTENDANCE_SYNC_CHUNK_SIZE = 12;

export type MeetParticipantKind =
  | "signedin"
  | "anonymous"
  | "phone"
  | "unknown";

export type MeetAttendanceParticipant = {
  name: string;
  displayName: string;
  kind: MeetParticipantKind;
  userId: string | null;
  earliestStartTime: string | null;
  latestEndTime: string | null;
  sessionCount: number;
  totalDurationMs: number | null;
};

export type MeetConferenceSummary = {
  id: string;
  name: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  space: string | null;
  meetingCode: string | null;
  participantCount: number | null;
};

export type MeetAttendanceConference = MeetConferenceSummary & {
  participants: MeetAttendanceParticipant[];
};

export type MeetConferenceFilter = {
  mode: "30d" | "date";
  date?: string;
  startIso?: string;
  endIso?: string;
};

export type AttendanceSyncSeed = {
  id: string;
  name: string;
  title: string;
  meetingCode: string | null;
  startTime: string | null;
  endTime: string | null;
  space: string | null;
};

type GoogleApiError = {
  error?: { message?: string; status?: string };
};

type ConferenceRecord = {
  name?: string;
  startTime?: string;
  endTime?: string;
  space?: string;
};

type ConferenceRecordsResponse = GoogleApiError & {
  conferenceRecords?: ConferenceRecord[];
  nextPageToken?: string;
};

type ParticipantRecord = {
  name?: string;
  earliestStartTime?: string;
  latestEndTime?: string;
  signedinUser?: { user?: string; displayName?: string };
  anonymousUser?: { displayName?: string };
  phoneUser?: { displayName?: string };
};

type ParticipantsResponse = GoogleApiError & {
  participants?: ParticipantRecord[];
};

type CalendarEvent = {
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: {
    conferenceId?: string;
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

type CalendarEventsResponse = GoogleApiError & {
  items?: CalendarEvent[];
};

type CalendarTitleEntry = {
  title: string;
  meetingCode: string | null;
  startMs: number;
  endMs: number;
};

type CalendarMeetIndex = {
  byCode: Map<string, CalendarTitleEntry[]>;
  all: CalendarTitleEntry[];
};

/** `conferenceRecords/{id}` → `{id}` for URL params. */
export function conferenceRecordId(name: string): string {
  const prefix = "conferenceRecords/";
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

/** URL id → full resource name. */
export function conferenceRecordName(id: string): string {
  const cleaned = id.replace(/^conferenceRecords\//, "");
  return `conferenceRecords/${cleaned}`;
}

/** Local-day bounds for a `YYYY-MM-DD` string in the caller's timezone. */
export function localDayBounds(date: string): {
  startIso: string;
  endIso: string;
} {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function durationMs(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return null;
  }
  return endMs - startMs;
}

function normalizeMeetingCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/meet\.google\.com\//, "")
    .replace(/\?.*$/, "");
  return cleaned || null;
}

function meetingCodeFromHangoutLink(
  link: string | null | undefined,
): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    if (!url.hostname.includes("meet.google.com")) return null;
    return normalizeMeetingCode(url.pathname.replace(/^\//, ""));
  } catch {
    return normalizeMeetingCode(link);
  }
}

export function parseConferenceFilter(data: unknown): MeetConferenceFilter {
  if (!data || typeof data !== "object") {
    return { mode: "30d" };
  }
  const raw = data as MeetConferenceFilter;
  const mode = raw.mode === "date" ? "date" : "30d";
  const date =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : undefined;
  const startIso =
    typeof raw.startIso === "string" && !Number.isNaN(Date.parse(raw.startIso))
      ? raw.startIso
      : undefined;
  const endIso =
    typeof raw.endIso === "string" && !Number.isNaN(Date.parse(raw.endIso))
      ? raw.endIso
      : undefined;
  return { mode, date, startIso, endIso };
}

export function resolveTimeWindow(filter: MeetConferenceFilter): {
  startIso: string;
  endIso: string;
} {
  if (filter.mode === "date") {
    if (filter.startIso && filter.endIso) {
      return { startIso: filter.startIso, endIso: filter.endIso };
    }
    if (filter.date) {
      return localDayBounds(filter.date);
    }
  }

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function buildConferenceListFilter(startIso: string, endIso: string): string {
  return `start_time>="${startIso}" AND start_time<"${endIso}"`;
}

function mapParticipantBase(p: ParticipantRecord) {
  if (p.signedinUser) {
    return {
      name: p.name ?? "",
      displayName: p.signedinUser.displayName ?? "Unknown",
      kind: "signedin" as const,
      userId: p.signedinUser.user ?? null,
      earliestStartTime: p.earliestStartTime ?? null,
      latestEndTime: p.latestEndTime ?? null,
    };
  }
  if (p.anonymousUser) {
    return {
      name: p.name ?? "",
      displayName: p.anonymousUser.displayName ?? "Anonymous",
      kind: "anonymous" as const,
      userId: null,
      earliestStartTime: p.earliestStartTime ?? null,
      latestEndTime: p.latestEndTime ?? null,
    };
  }
  if (p.phoneUser) {
    return {
      name: p.name ?? "",
      displayName: p.phoneUser.displayName ?? "Phone user",
      kind: "phone" as const,
      userId: null,
      earliestStartTime: p.earliestStartTime ?? null,
      latestEndTime: p.latestEndTime ?? null,
    };
  }
  return {
    name: p.name ?? "",
    displayName: "Unknown",
    kind: "unknown" as const,
    userId: null,
    earliestStartTime: p.earliestStartTime ?? null,
    latestEndTime: p.latestEndTime ?? null,
  };
}

export function buildParticipantFromRecord(
  record: ParticipantRecord,
): MeetAttendanceParticipant {
  const base = mapParticipantBase(record);
  return {
    ...base,
    sessionCount: 1,
    totalDurationMs: durationMs(base.earliestStartTime, base.latestEndTime),
  };
}

export async function listConferenceRecords(
  accessToken: string,
  startIso: string,
  endIso: string,
  options?: { pageToken?: string; pageSize?: number },
): Promise<
  | { records: ConferenceRecord[]; nextPageToken?: string }
  | { error: string }
> {
  const params = new URLSearchParams({
    pageSize: String(options?.pageSize ?? 50),
    filter: buildConferenceListFilter(startIso, endIso),
  });
  if (options?.pageToken) params.set("pageToken", options.pageToken);

  const response = await fetch(`${MEET_API}/conferenceRecords?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data: ConferenceRecordsResponse = await response.json();

  if (!response.ok) {
    const message = data.error?.message ?? `Meet API error (${response.status})`;
    if (
      response.status === 403 ||
      data.error?.status === "PERMISSION_DENIED" ||
      /scope|insufficient|permission/i.test(message)
    ) {
      return {
        error:
          "Meet access not granted. Sign out and sign in again to grant Meet attendance permission.",
      };
    }
    return { error: message };
  }

  return {
    records: data.conferenceRecords ?? [],
    nextPageToken: data.nextPageToken,
  };
}

/** Paginate Meet conferenceRecords within the retention window (capped). */
export async function listAllConferenceRecords(
  accessToken: string,
  startIso: string,
  endIso: string,
): Promise<{ records: ConferenceRecord[] } | { error: string }> {
  const records: ConferenceRecord[] = [];
  let pageToken: string | undefined;
  const maxPages = 3;

  for (let page = 0; page < maxPages; page++) {
    const listResult = await listConferenceRecords(
      accessToken,
      startIso,
      endIso,
      { pageToken, pageSize: 50 },
    );
    if ("error" in listResult) return listResult;
    records.push(...listResult.records);
    pageToken = listResult.nextPageToken;
    if (!pageToken) break;
  }

  return { records };
}

export async function listParticipants(
  accessToken: string,
  parent: string,
): Promise<{ participants: ParticipantRecord[] } | { error: string }> {
  const params = new URLSearchParams({ pageSize: "100" });
  const response = await fetch(
    `${MEET_API}/${parent}/participants?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data: ParticipantsResponse = await response.json();

  if (!response.ok) {
    return {
      error:
        data.error?.message ??
        `Meet participants API error (${response.status})`,
    };
  }

  return { participants: data.participants ?? [] };
}

function meetingCodeFromText(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(
    /(?:https?:\/\/)?meet\.google\.com\/([a-z0-9-]+)/i,
  );
  return normalizeMeetingCode(match?.[1] ?? null);
}

function eventMeetingCode(event: CalendarEvent): string | null {
  const fromConferenceId = normalizeMeetingCode(
    event.conferenceData?.conferenceId,
  );
  if (fromConferenceId) return fromConferenceId;

  const fromHangout = meetingCodeFromHangoutLink(event.hangoutLink);
  if (fromHangout) return fromHangout;

  for (const entry of event.conferenceData?.entryPoints ?? []) {
    const code = meetingCodeFromHangoutLink(entry.uri);
    if (code) return code;
  }

  return (
    meetingCodeFromText(event.location) ??
    meetingCodeFromText(event.description)
  );
}

function eventHasMeetLink(event: CalendarEvent): boolean {
  return eventMeetingCode(event) !== null;
}

function eventBounds(
  event: CalendarEvent,
): { startMs: number; endMs: number } | null {
  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw = event.end?.dateTime ?? event.end?.date;
  if (!startRaw || !endRaw) return null;
  const startMs = Date.parse(startRaw);
  const endMs = Date.parse(endRaw);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return { startMs, endMs };
}

function emptyCalendarMeetIndex(): CalendarMeetIndex {
  return { byCode: new Map(), all: [] };
}

async function listCalendarMeetTitles(
  accessToken: string,
  startIso: string,
  endIso: string,
): Promise<CalendarMeetIndex> {
  const index = emptyCalendarMeetIndex();
  const paddedStart = new Date(
    Date.parse(startIso) - 6 * 60 * 60 * 1000,
  ).toISOString();
  const paddedEnd = new Date(
    Date.parse(endIso) + 6 * 60 * 60 * 1000,
  ).toISOString();

  const params = new URLSearchParams({
    timeMin: paddedStart,
    timeMax: paddedEnd,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    conferenceDataVersion: "1",
  });

  const response = await fetch(
    `${CALENDAR_API}/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data: CalendarEventsResponse = await response.json();
  if (!response.ok) {
    console.error(
      "[meet-attendance] calendar fetch failed:",
      data.error?.message ?? response.status,
    );
    return index;
  }

  const seen = new Set<string>();
  for (const event of data.items ?? []) {
    if (!eventHasMeetLink(event)) continue;
    const bounds = eventBounds(event);
    const title = event.summary?.trim();
    if (!bounds || !title) continue;

    const meetingCode = eventMeetingCode(event);
    const dedupeKey = `${meetingCode ?? "none"}|${bounds.startMs}|${bounds.endMs}|${title}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const entry: CalendarTitleEntry = {
      title,
      meetingCode,
      startMs: bounds.startMs,
      endMs: bounds.endMs,
    };
    index.all.push(entry);

    if (meetingCode) {
      const list = index.byCode.get(meetingCode) ?? [];
      list.push(entry);
      index.byCode.set(meetingCode, list);
    }
  }

  return index;
}

function pickBestCalendarTitle(
  candidates: CalendarTitleEntry[],
  startTime: string | null,
  endTime: string | null,
): CalendarTitleEntry | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;

  const confStart = startTime ? Date.parse(startTime) : NaN;
  const confEnd = endTime ? Date.parse(endTime) : Number.NaN;
  const effectiveEnd = Number.isNaN(confEnd) ? Date.now() : confEnd;

  let best: CalendarTitleEntry | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const overlaps =
      !Number.isNaN(confStart) &&
      confStart < candidate.endMs &&
      effectiveEnd > candidate.startMs;

    const delta = Number.isNaN(confStart)
      ? 0
      : Math.abs(candidate.startMs - confStart);

    const score = overlaps
      ? delta
      : delta > 3 * 60 * 60 * 1000
        ? Number.POSITIVE_INFINITY
        : delta + 24 * 60 * 60 * 1000;

    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return Number.isFinite(bestScore) ? best : null;
}

function resolveTitle(
  startTime: string | null,
  endTime: string | null,
  index: CalendarMeetIndex,
): { title: string; meetingCode: string | null } {
  const match = pickBestCalendarTitle(index.all, startTime, endTime);
  if (match) {
    return { title: match.title, meetingCode: match.meetingCode };
  }
  return { title: "Untitled meeting", meetingCode: null };
}

function toSummary(
  record: ConferenceRecord,
  calendarIndex: CalendarMeetIndex,
): MeetConferenceSummary | null {
  if (!record.name) return null;

  const startTime = record.startTime ?? null;
  const endTime = record.endTime ?? null;
  const resolved = resolveTitle(startTime, endTime, calendarIndex);

  return {
    id: conferenceRecordId(record.name),
    name: record.name,
    title: resolved.title,
    startTime,
    endTime,
    space: record.space ?? null,
    meetingCode: resolved.meetingCode,
    participantCount: null,
  };
}

async function loadCalendarIndex(
  accessToken: string,
  scope: string,
  startIso: string,
  endIso: string,
): Promise<{ index: CalendarMeetIndex; calendarScopeMissing: boolean }> {
  const calendarScopeMissing = Boolean(
    scope && !scope.includes(CALENDAR_SCOPE),
  );
  const index = calendarScopeMissing
    ? emptyCalendarMeetIndex()
    : await listCalendarMeetTitles(accessToken, startIso, endIso);
  return { index, calendarScopeMissing };
}

/** List conferences for a window (1 Meet page + 1 Calendar fetch). */
export async function fetchMeetConferenceSummaries(
  accessToken: string,
  scope: string,
  filter: MeetConferenceFilter,
): Promise<{
  conferences: MeetConferenceSummary[];
  error?: string;
  calendarScopeMissing?: boolean;
}> {
  const window = resolveTimeWindow(filter);
  const listResult = await listConferenceRecords(
    accessToken,
    window.startIso,
    window.endIso,
  );
  if ("error" in listResult) {
    return { conferences: [], error: listResult.error };
  }

  const { index, calendarScopeMissing } = await loadCalendarIndex(
    accessToken,
    scope,
    window.startIso,
    window.endIso,
  );

  const conferences = listResult.records
    .map((record) => toSummary(record, index))
    .filter((row): row is MeetConferenceSummary => row !== null);

  return { conferences, calendarScopeMissing };
}

/** Discover conferences across up to 3 Meet pages (prepare for bulk sync). */
export async function prepareMeetAttendanceSeeds(
  accessToken: string,
  scope: string,
  filter: MeetConferenceFilter = { mode: "30d" },
): Promise<{ conferences: AttendanceSyncSeed[]; error?: string }> {
  const window = resolveTimeWindow(filter);
  const listResult = await listAllConferenceRecords(
    accessToken,
    window.startIso,
    window.endIso,
  );
  if ("error" in listResult) {
    return { conferences: [], error: listResult.error };
  }

  const { index } = await loadCalendarIndex(
    accessToken,
    scope,
    window.startIso,
    window.endIso,
  );

  const conferences = listResult.records
    .map((record) => toSummary(record, index))
    .filter((row): row is MeetConferenceSummary => row !== null)
    .map(
      (row): AttendanceSyncSeed => ({
        id: row.id,
        name: row.name,
        title: row.title,
        meetingCode: row.meetingCode,
        startTime: row.startTime,
        endTime: row.endTime,
        space: row.space,
      }),
    );

  return { conferences };
}

/** Load participants for one conference seed. */
export async function fetchConferenceWithParticipants(
  accessToken: string,
  seed: AttendanceSyncSeed,
): Promise<MeetAttendanceConference | { error: string }> {
  const participantsResult = await listParticipants(accessToken, seed.name);
  if ("error" in participantsResult) {
    return { error: participantsResult.error };
  }

  const participants = participantsResult.participants.map(
    buildParticipantFromRecord,
  );

  return {
    id: seed.id,
    name: seed.name,
    title: seed.title,
    startTime: seed.startTime,
    endTime: seed.endTime,
    space: seed.space,
    meetingCode: seed.meetingCode,
    participantCount: participants.length,
    participants,
  };
}
