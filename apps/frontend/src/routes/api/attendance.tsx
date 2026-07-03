import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSession } from "~/lib/get-session";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  getAttendanceByDate,
  upsertAttendanceRecords,
} from "@workspace/db/repositories/attendance-repository";
import { attendanceStatuses } from "@workspace/db/enums";

const attendanceRecordSchema = z.object({
  prismicUid: z.string().min(1),
  status: z.enum(attendanceStatuses),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const postBodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  records: z.array(attendanceRecordSchema).min(1),
});

export const Route = createFileRoute("/api/attendance")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const url = new URL(request.url);
          const date = url.searchParams.get("date");

          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return Response.json(
              { error: "date query param required (YYYY-MM-DD)" },
              { status: 400 },
            );
          }

          const attendance = await getAttendanceByDate(date);

          return Response.json({ attendance, date }, { status: 200 });
        } catch (error) {
          console.error("Error fetching attendance:", error);
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            { status: 500 },
          );
        }
      },

      POST: async ({ request }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const { user } = authSession;

          const body = await request.json();
          const result = postBodySchema.safeParse(body);
          if (!result.success) {
            return Response.json(
              { error: result.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { date, records } = result.data;

          const savedRecords = await upsertAttendanceRecords(
            date,
            records.map((r) => ({
              prismicUid: r.prismicUid,
              status: r.status,
              checkInTime: r.checkInTime ?? null,
              checkOutTime: r.checkOutTime ?? null,
              notes: r.notes ?? null,
            })),
            user.id,
          );

          insertAuditLog({
            userId: user.id,
            action: "save_attendance",
            entityType: "attendance",
            entityId: date,
            details: {
              date,
              count: records.length,
              statuses: records.reduce(
                (acc, r) => {
                  acc[r.status] = (acc[r.status] ?? 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ),
            },
          }).catch((error) =>
            console.error("Error inserting audit log:", error),
          );

          console.info(
            JSON.stringify({
              event: "attendance_saved",
              date,
              count: records.length,
              userId: user.id,
              durationMs: Date.now() - startTime,
            }),
          );

          return Response.json(
            { success: true, data: savedRecords },
            { status: 200 },
          );
        } catch (error) {
          console.error(
            `Error saving attendance after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to save attendance",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
