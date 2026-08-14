import { createServerFn } from "@tanstack/react-start";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  listStoredAttendanceRows,
  persistConferenceAttendance,
  type MeetConferenceInput,
  type StoredAttendanceRow,
} from "@workspace/db/repositories/meet-attendance-repository";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { getGoogleAccessToken } from "~/lib/attendance/meet-auth";
import {
  ATTENDANCE_SYNC_CHUNK_SIZE,
  buildConferenceDetail,
  fetchConferenceWithParticipants,
  fetchMeetConferenceSummaries,
  parseConferenceFilter,
  prepareMeetAttendanceSeeds,
  type AttendanceSyncSeed,
  type MeetAttendanceConference,
  type MeetConferenceSummary,
} from "~/lib/attendance/meet-attendance";

export { ATTENDANCE_SYNC_CHUNK_SIZE };
export type { AttendanceSyncSeed };

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

/** Full attendance for one conference (detail page) + persisted to D1. */
export const getMeetConferenceDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("conferenceId is required");
    }
    const conferenceId = (data as { conferenceId?: unknown }).conferenceId;
    if (typeof conferenceId !== "string" || !conferenceId.trim()) {
      throw new Error("conferenceId is required");
    }
    return { conferenceId: conferenceId.trim() };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      conference: MeetAttendanceConference | null;
      error?: string;
      calendarScopeMissing?: boolean;
    }> => {
      const tokenResult = await getGoogleAccessToken();
      if ("error" in tokenResult) {
        return { conference: null, error: tokenResult.error };
      }

      const result = await buildConferenceDetail(
        tokenResult.accessToken,
        tokenResult.scope,
        data.conferenceId,
      );
      if (result.error || !result.conference) {
        return {
          conference: null,
          error: result.error,
          calendarScopeMissing: result.calendarScopeMissing,
        };
      }

      try {
        await persistConferenceAttendance({
          conference: toConferenceInput(result.conference),
          syncedByUserId: tokenResult.session.user.id,
        });
      } catch (error) {
        console.error(
          "[meet-attendance] persist failed:",
          error instanceof Error ? error.message : error,
        );
      }

      return {
        conference: result.conference,
        calendarScopeMissing: result.calendarScopeMissing,
      };
    },
  );

/** Firm-wide attendance compiled in D1 (any signed-in user). */
export const getStoredAttendance = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      return { date: undefined as string | undefined, page: undefined as number | undefined };
    }
    const raw = data as { date?: unknown; page?: unknown };
    const date =
      typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
        ? raw.date
        : undefined;
    const page =
      typeof raw.page === "string"
        ? Number.parseInt(raw.page, 10)
        : typeof raw.page === "number"
          ? raw.page
          : undefined;
    return {
      date,
      page:
        typeof page === "number" && Number.isFinite(page) && page >= 1
          ? Math.floor(page)
          : undefined,
    };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      date: string | null;
      rows: StoredAttendanceRow[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      error?: string;
    }> => {
      try {
        const result = await listStoredAttendanceRows({
          ...(data.date ? { date: data.date } : {}),
          ...(data.page ? { page: data.page } : {}),
        });
        return {
          date: data.date ?? null,
          rows: result.rows,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[stored-attendance] list failed:", message);
        return {
          date: data.date ?? null,
          rows: [],
          total: 0,
          page: data.page ?? 1,
          limit: 50,
          totalPages: 1,
          error: message,
        };
      }
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

/** Persist a small chunk of conferences + participants to D1 (subrequest-safe). */
export const syncAttendanceChunk = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("conferences are required");
    }
    const conferences = (data as { conferences?: unknown }).conferences;
    if (!Array.isArray(conferences) || conferences.length === 0) {
      throw new Error("conferences are required");
    }
    if (conferences.length > ATTENDANCE_SYNC_CHUNK_SIZE) {
      throw new Error(
        `At most ${ATTENDANCE_SYNC_CHUNK_SIZE} conferences per sync chunk`,
      );
    }

    const parsed: AttendanceSyncSeed[] = [];
    for (const item of conferences) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<AttendanceSyncSeed>;
      if (typeof row.id !== "string" || typeof row.name !== "string") continue;
      if (typeof row.title !== "string") continue;
      parsed.push({
        id: row.id,
        name: row.name,
        title: row.title,
        meetingCode:
          typeof row.meetingCode === "string" ? row.meetingCode : null,
        startTime: typeof row.startTime === "string" ? row.startTime : null,
        endTime: typeof row.endTime === "string" ? row.endTime : null,
        space: typeof row.space === "string" ? row.space : null,
      });
    }
    if (parsed.length === 0) {
      throw new Error("conferences are required");
    }
    return { conferences: parsed };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      synced: number;
      failed: number;
      error?: string;
    }> => {
      const tokenResult = await getGoogleAccessToken();
      if ("error" in tokenResult) {
        return { synced: 0, failed: 0, error: tokenResult.error };
      }

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
            console.error(
              "[attendance-sync] participants failed:",
              seed.id,
              result.error,
            );
            continue;
          }

          await persistConferenceAttendance({
            conference: toConferenceInput(result),
            syncedByUserId: tokenResult.session.user.id,
          });
          synced += 1;
        } catch (error) {
          failed += 1;
          console.error(
            "[attendance-sync] chunk item failed:",
            seed.id,
            error instanceof Error ? error.message : error,
          );
        }
      }

      if (synced > 0) {
        insertAuditLog({
          userId: tokenResult.session.user.id,
          action: "sync_meet_attendance",
          entityType: "attendance",
          entityId: data.conferences[0]?.id ?? "meet",
          details: {
            synced,
            failed,
            conferenceIds: data.conferences.map((c) => c.id),
          },
        }).catch((error) => console.error("Error inserting audit log:", error));
      }

      return { synced, failed };
    },
  );

function toConferenceInput(
  conference: MeetAttendanceConference,
): MeetConferenceInput {
  return {
    id: conference.id,
    name: conference.name,
    title: conference.title,
    meetingCode: conference.meetingCode,
    space: conference.space,
    startTime: conference.startTime,
    endTime: conference.endTime,
    participants: conference.participants.map((participant) => ({
      displayName: participant.displayName,
      userId: participant.userId,
      kind: participant.kind,
      earliestStartTime: participant.earliestStartTime,
      latestEndTime: participant.latestEndTime,
      totalDurationMs: participant.totalDurationMs,
    })),
  };
}
