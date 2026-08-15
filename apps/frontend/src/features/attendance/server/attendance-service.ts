import { db } from "@workspace/db/db";
import { asc, count, desc, eq } from "@workspace/db";
import { meetAttendee, meetConference } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import type {
  MeetAttendeeInput,
  MeetConferenceInput,
  MeetParticipantKind,
  StoredAttendanceRow,
} from "../types";

export type { StoredAttendanceRow } from "../types";

// Audit log details are an arbitrary JSON payload recorded at audit time;
// values are JSON-serializable by construction.
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type AuditDetails = Record<string, JsonValue>;

// ---- Meet attendance persistence (attendance feature owns these queries) ----

function parseTimestamp(value: string | null): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

function attendanceDateFromStart(startTime: string | null): string {
  const date = parseTimestamp(startTime) ?? new Date();
  return date.toISOString().slice(0, 10);
}

function attendeeDedupeKey(participant: MeetAttendeeInput): string {
  if (participant.userId) {
    return `user:${participant.userId}`;
  }
  return `name:${participant.kind}:${participant.displayName.trim().toLowerCase()}`;
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function asKind(value: string): MeetParticipantKind {
  switch (value) {
    case "signedin":
    case "anonymous":
    case "phone":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

async function persistConferenceAttendance(input: {
  conference: MeetConferenceInput;
  syncedByUserId: string;
}): Promise<void> {
  const { conference, syncedByUserId } = input;
  const startsAt = parseTimestamp(conference.startTime);
  const endsAt = parseTimestamp(conference.endTime);
  const attendanceDate = attendanceDateFromStart(conference.startTime);
  const now = new Date();

  await db
    .insert(meetConference)
    .values({
      id: conference.id,
      googleResourceName: conference.name,
      title: conference.title,
      meetingCode: conference.meetingCode,
      spaceName: conference.space,
      startsAt,
      endsAt,
      attendanceDate,
      syncedByUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: meetConference.id,
      set: {
        googleResourceName: conference.name,
        title: conference.title,
        meetingCode: conference.meetingCode,
        spaceName: conference.space,
        startsAt,
        endsAt,
        attendanceDate,
        syncedByUserId,
        updatedAt: now,
      },
    });

  await db
    .delete(meetAttendee)
    .where(eq(meetAttendee.conferenceId, conference.id));

  if (conference.participants.length === 0) return;

  await db.insert(meetAttendee).values(
    conference.participants.map((participant) => ({
      id: crypto.randomUUID(),
      conferenceId: conference.id,
      displayName: participant.displayName,
      googleUserId: participant.userId,
      kind: participant.kind,
      joinedAt: parseTimestamp(participant.earliestStartTime),
      leftAt: parseTimestamp(participant.latestEndTime),
      durationMs: participant.totalDurationMs,
      dedupeKey: attendeeDedupeKey(participant),
      createdAt: now,
    })),
  );
}

/** Flat attendee rows for the Meeting Attendance data table, paginated. */
async function listStoredAttendanceRows(options?: {
  date?: string;
  page?: number;
  limit?: number;
}): Promise<{
  rows: StoredAttendanceRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const page = Math.max(options?.page ?? 1, 1);
  const offset = (page - 1) * limit;

  const whereClause = options?.date
    ? eq(meetConference.attendanceDate, options.date)
    : undefined;

  const [totalResult, rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(meetConference)
      .innerJoin(meetAttendee, eq(meetAttendee.conferenceId, meetConference.id))
      .where(whereClause),
    db
      .select({
        attendeeId: meetAttendee.id,
        attendanceDate: meetConference.attendanceDate,
        conferenceId: meetConference.id,
        meetingTitle: meetConference.title,
        meetingCode: meetConference.meetingCode,
        displayName: meetAttendee.displayName,
        kind: meetAttendee.kind,
        joinedAt: meetAttendee.joinedAt,
        leftAt: meetAttendee.leftAt,
        durationMs: meetAttendee.durationMs,
      })
      .from(meetConference)
      .innerJoin(meetAttendee, eq(meetAttendee.conferenceId, meetConference.id))
      .where(whereClause)
      .orderBy(
        desc(meetConference.attendanceDate),
        asc(meetConference.startsAt),
        asc(meetAttendee.displayName),
      )
      .limit(limit)
      .offset(offset),
  ]);

  const total = totalResult[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    rows: rows.map((row) => ({
      id: row.attendeeId,
      attendanceDate: row.attendanceDate,
      conferenceId: row.conferenceId,
      meetingTitle: row.meetingTitle,
      meetingCode: row.meetingCode,
      displayName: row.displayName,
      kind: asKind(row.kind),
      joinedAt: toIso(row.joinedAt),
      leftAt: toIso(row.leftAt),
      durationMs: row.durationMs,
    })),
    total,
    page,
    limit,
    totalPages,
  };
}

type StoredRowsInput = {
  date?: string;
  page?: number;
};

export const attendanceService = {
  async persistConference(
    conference: MeetConferenceInput,
    syncedByUserId: string,
  ) {
    return persistConferenceAttendance({
      conference,
      syncedByUserId,
    });
  },

  async listStored(data: { date?: string; page?: number }) {
    const input: StoredRowsInput = {};
    if (data.date) input.date = data.date;
    if (data.page) input.page = data.page;
    return listStoredAttendanceRows(input);
  },

  async insertAudit(input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details: AuditDetails;
  }) {
    return insertAuditLog(input);
  },
};
