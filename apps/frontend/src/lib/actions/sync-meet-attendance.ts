import { createServerFn } from "@tanstack/react-start";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { persistAggregatedMeetAttendance } from "~/lib/attendance/apply-meet-attendance";
import { aggregateMeetAttendance } from "~/lib/attendance/meet-attendance-aggregate";
import { loadAllPrismicMembers } from "~/lib/attendance/resolve-member-by-name";
import { getGoogleAccessToken } from "~/lib/attendance/meet-auth";
import {
  ATTENDANCE_SYNC_CHUNK_SIZE,
  fetchConferenceWithParticipants,
  fetchMeetConferenceSummaries,
  parseConferenceFilter,
  prepareMeetAttendanceSeeds,
  type AttendanceSyncSeed,
  type MeetAttendanceConference,
  type MeetConferenceSummary,
} from "~/lib/attendance/meet-attendance";

export { ATTENDANCE_SYNC_CHUNK_SIZE };

/** Live Meet conferences for the signed-in Google account (list only). */
export const getMeetConferences = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: unknown) => parseConferenceFilter(data))
  .handler(
    async ({
      data,
    }): Promise<{
      conferences: MeetConferenceSummary[];
      error?: string;
      calendarScopeMissing?: boolean;
    }> => {
      const tokenResult = await getGoogleAccessToken();
      if ("error" in tokenResult) {
        return { conferences: [], error: tokenResult.error };
      }

      return fetchMeetConferenceSummaries(
        tokenResult.accessToken,
        tokenResult.scope,
        data,
      );
    },
  );

/** Discover Meet conferences to sync (≤3 pages × 50). */
export const prepareAttendanceSync = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: unknown) => parseConferenceFilter(data ?? { mode: "30d" }))
  .handler(
    async ({
      data,
    }): Promise<{ conferences: AttendanceSyncSeed[]; error?: string }> => {
      const tokenResult = await getGoogleAccessToken();
      if ("error" in tokenResult) {
        return { conferences: [], error: tokenResult.error };
      }

      return prepareMeetAttendanceSeeds(
        tokenResult.accessToken,
        tokenResult.scope,
        data,
      );
    },
  );

function parseSyncChunkInput(data: unknown): {
  conferences: AttendanceSyncSeed[];
  date?: string;
} {
  if (!data || typeof data !== "object") {
    throw new Error("conferences are required");
  }
  const raw = data as { conferences?: unknown; date?: unknown };
  if (!Array.isArray(raw.conferences) || raw.conferences.length === 0) {
    throw new Error("conferences are required");
  }
  if (raw.conferences.length > ATTENDANCE_SYNC_CHUNK_SIZE) {
    throw new Error(
      `At most ${ATTENDANCE_SYNC_CHUNK_SIZE} conferences per sync chunk`,
    );
  }

  const parsed: AttendanceSyncSeed[] = [];
  for (const item of raw.conferences) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<AttendanceSyncSeed>;
    if (typeof row.id !== "string" || typeof row.name !== "string") continue;
    if (typeof row.title !== "string") continue;
    parsed.push({
      id: row.id,
      name: row.name,
      title: row.title,
      meetingCode: typeof row.meetingCode === "string" ? row.meetingCode : null,
      startTime: typeof row.startTime === "string" ? row.startTime : null,
      endTime: typeof row.endTime === "string" ? row.endTime : null,
      space: typeof row.space === "string" ? row.space : null,
    });
  }
  if (parsed.length === 0) {
    throw new Error("conferences are required");
  }

  const date =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : undefined;

  return { conferences: parsed, date };
}

/**
 * Fetch participants for ≤12 conferences and upsert matched employees
 * into the recruiting `attendance` table.
 */
export const syncAttendanceChunk = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: unknown) => parseSyncChunkInput(data))
  .handler(
    async ({
      data,
    }): Promise<{
      synced: number;
      failed: number;
      marked: number;
      unmatched: string[];
      ambiguous: Array<{ displayName: string; matches: string[] }>;
      error?: string;
    }> => {
      const tokenResult = await getGoogleAccessToken();
      if ("error" in tokenResult) {
        return {
          synced: 0,
          failed: 0,
          marked: 0,
          unmatched: [],
          ambiguous: [],
          error: tokenResult.error,
        };
      }

      const members = await loadAllPrismicMembers();
      const conferences: MeetAttendanceConference[] = [];
      let synced = 0;
      let failed = 0;

      for (const seed of data.conferences) {
        try {
          const result = await fetchConferenceWithParticipants(
            tokenResult.accessToken,
            seed,
          );
          if ("error" in result) {
            failed += 1;
            console.error("[meet-sync] participants failed:", seed.id, result.error);
            continue;
          }
          conferences.push(result);
          synced += 1;
        } catch (error) {
          failed += 1;
          console.error(
            "[meet-sync] chunk item failed:",
            seed.id,
            error instanceof Error ? error.message : error,
          );
        }
      }

      const aggregated = aggregateMeetAttendance(conferences, members);
      const date = data.date ?? aggregated.attendanceDate;
      const { marked } = await persistAggregatedMeetAttendance({
        aggregates: Array.from(aggregated.byUid.values()),
        date,
        markedBy: tokenResult.session.user.id,
      });

      if (marked > 0) {
        insertAuditLog({
          userId: tokenResult.session.user.id,
          action: "sync_meet_attendance",
          entityType: "attendance",
          entityId: date,
          details: {
            date,
            marked,
            synced,
            failed,
            conferenceIds: data.conferences.map((c) => c.id),
            unmatched: aggregated.unmatched,
          },
        }).catch((error) => console.error("Error inserting audit log:", error));
      }

      return {
        synced,
        failed,
        marked,
        unmatched: aggregated.unmatched,
        ambiguous: aggregated.ambiguous,
      };
    },
  );

/**
 * One-shot sync for a calendar day: discover meetings that day, fetch
 * participants in chunks of 12, upsert matched employees as present.
 */
export const syncMeetAttendanceForDate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("date is required");
    }
    const raw = data as {
      date?: unknown;
      startIso?: unknown;
      endIso?: unknown;
    };
    if (typeof raw.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) {
      throw new Error("date must be YYYY-MM-DD");
    }
    const startIso =
      typeof raw.startIso === "string" && !Number.isNaN(Date.parse(raw.startIso))
        ? raw.startIso
        : undefined;
    const endIso =
      typeof raw.endIso === "string" && !Number.isNaN(Date.parse(raw.endIso))
        ? raw.endIso
        : undefined;
    return { date: raw.date, startIso, endIso };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      meetings: number;
      marked: number;
      failed: number;
      unmatched: string[];
      ambiguous: Array<{ displayName: string; matches: string[] }>;
      error?: string;
      calendarScopeMissing?: boolean;
    }> => {
      const tokenResult = await getGoogleAccessToken();
      if ("error" in tokenResult) {
        return {
          meetings: 0,
          marked: 0,
          failed: 0,
          unmatched: [],
          ambiguous: [],
          error: tokenResult.error,
        };
      }

      const prepare = await prepareMeetAttendanceSeeds(
        tokenResult.accessToken,
        tokenResult.scope,
        {
          mode: "date",
          date: data.date,
          startIso: data.startIso,
          endIso: data.endIso,
        },
      );
      if (prepare.error) {
        return {
          meetings: 0,
          marked: 0,
          failed: 0,
          unmatched: [],
          ambiguous: [],
          error: prepare.error,
        };
      }

      if (prepare.conferences.length === 0) {
        return {
          meetings: 0,
          marked: 0,
          failed: 0,
          unmatched: [],
          ambiguous: [],
        };
      }

      const members = await loadAllPrismicMembers();
      const conferences: MeetAttendanceConference[] = [];
      let failed = 0;

      for (let i = 0; i < prepare.conferences.length; i += ATTENDANCE_SYNC_CHUNK_SIZE) {
        const chunk = prepare.conferences.slice(
          i,
          i + ATTENDANCE_SYNC_CHUNK_SIZE,
        );
        for (const seed of chunk) {
          try {
            const result = await fetchConferenceWithParticipants(
              tokenResult.accessToken,
              seed,
            );
            if ("error" in result) {
              failed += 1;
              continue;
            }
            conferences.push(result);
          } catch {
            failed += 1;
          }
        }
      }

      const aggregated = aggregateMeetAttendance(conferences, members);
      const { marked } = await persistAggregatedMeetAttendance({
        aggregates: Array.from(aggregated.byUid.values()),
        date: data.date,
        markedBy: tokenResult.session.user.id,
      });

      insertAuditLog({
        userId: tokenResult.session.user.id,
        action: "sync_meet_attendance_date",
        entityType: "attendance",
        entityId: data.date,
        details: {
          date: data.date,
          meetings: prepare.conferences.length,
          marked,
          failed,
          unmatched: aggregated.unmatched,
        },
      }).catch((error) => console.error("Error inserting audit log:", error));

      console.info(
        JSON.stringify({
          event: "meet_attendance_synced",
          date: data.date,
          meetings: prepare.conferences.length,
          marked,
          failed,
        }),
      );

      return {
        meetings: prepare.conferences.length,
        marked,
        failed,
        unmatched: aggregated.unmatched,
        ambiguous: aggregated.ambiguous,
        calendarScopeMissing: Boolean(
          tokenResult.scope &&
            !tokenResult.scope.includes(
              "https://www.googleapis.com/auth/calendar.readonly",
            ),
        ),
      };
    },
  );
