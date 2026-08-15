import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { attendanceService, type StoredAttendanceRow } from "./attendance-service";
import type { MeetConferenceInput } from "../types";
import { getGoogleAccessToken } from "#/features/attendance/meet-auth";
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
  type RawConferenceFilter,
} from "#/features/attendance/meet-attendance";

export { ATTENDANCE_SYNC_CHUNK_SIZE };
export type { AttendanceSyncSeed };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateSchema = z.string().regex(DATE_PATTERN);

const conferenceIdInputSchema = z.object({ conferenceId: z.string() });
const storedAttendanceObjectSchema = z.object({
  date: z.unknown().optional(),
  page: z.unknown().optional(),
});
const syncChunkObjectSchema = z.object({
  conferences: z.unknown().optional(),
});

const syncSeedCoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
});

/** Raw `{ conferenceId }` payload (untrusted) before validation. */
type RawConferenceIdInput = { conferenceId?: unknown };
/** Raw stored-attendance filter payload (untrusted) before validation. */
type RawStoredAttendanceInput = { date?: unknown; page?: unknown };
/** Raw `{ conferences }` sync payload (untrusted) before validation. */
type RawSyncChunkInput = { conferences?: unknown };

/** Live Meet conferences for the signed-in Google account (list only). */
export const getMeetConferences = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: RawConferenceFilter) => parseConferenceFilter(data))
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
  .validator((data: RawConferenceIdInput) => {
    const parsed = conferenceIdInputSchema.safeParse(data);
    if (!parsed.success || !parsed.data.conferenceId.trim()) {
      throw new Error("conferenceId is required");
    }
    return { conferenceId: parsed.data.conferenceId.trim() };
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
        await attendanceService.persistConference(
          toConferenceInput(result.conference),
          tokenResult.session.user.id,
        );
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
  .validator((data: RawStoredAttendanceInput) => {
    const parsed = storedAttendanceObjectSchema.safeParse(data);
    if (!parsed.success) {
      return { date: undefined, page: undefined };
    }
    const dateResult = dateSchema.safeParse(parsed.data.date);
    const pageNumberResult = z.number().safeParse(parsed.data.page);
    let page: number | undefined;
    if (pageNumberResult.success) {
      const value = pageNumberResult.data;
      page =
        Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;
    } else {
      const pageStringResult = z.string().safeParse(parsed.data.page);
      if (pageStringResult.success) {
        const value = Number.parseInt(pageStringResult.data, 10);
        page =
          Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;
      }
    }
    return {
      date: dateResult.success ? dateResult.data : undefined,
      page,
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
        const result = await attendanceService.listStored(data);
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
  .validator((data: RawConferenceFilter | undefined) =>
    parseConferenceFilter(data ?? { mode: "30d" }),
  )
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
  .validator((data: RawSyncChunkInput) => {
    const parsed = syncChunkObjectSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error("conferences are required");
    }
    const conferences = parsed.data.conferences;
    if (!Array.isArray(conferences) || conferences.length === 0) {
      throw new Error("conferences are required");
    }
    if (conferences.length > ATTENDANCE_SYNC_CHUNK_SIZE) {
      throw new Error(
        `At most ${ATTENDANCE_SYNC_CHUNK_SIZE} conferences per sync chunk`,
      );
    }

    const parsedSeeds: AttendanceSyncSeed[] = [];
    for (const item of conferences) {
      const core = syncSeedCoreSchema.safeParse(item);
      if (!core.success) continue;
      const meetingCode = z.string().safeParse(item.meetingCode);
      const startTime = z.string().safeParse(item.startTime);
      const endTime = z.string().safeParse(item.endTime);
      const space = z.string().safeParse(item.space);
      parsedSeeds.push({
        id: core.data.id,
        name: core.data.name,
        title: core.data.title,
        meetingCode: meetingCode.success ? meetingCode.data : null,
        startTime: startTime.success ? startTime.data : null,
        endTime: endTime.success ? endTime.data : null,
        space: space.success ? space.data : null,
      });
    }
    if (parsedSeeds.length === 0) {
      throw new Error("conferences are required");
    }
    return { conferences: parsedSeeds };
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

          await attendanceService.persistConference(
            toConferenceInput(result),
            tokenResult.session.user.id,
          );
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
        attendanceService.insertAudit({
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
