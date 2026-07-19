import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { upsertAttendanceRecord } from "@workspace/db/repositories/attendance-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { attendanceStatuses } from "@workspace/db/enums";
import { matchMemberByName } from "~/lib/attendance/match-member-by-name";
import { loadAllPrismicMembers } from "~/lib/attendance/resolve-member-by-name";
import { resolveAttendanceServiceUserId } from "~/lib/attendance/resolve-service-user";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const markBodySchema = z.object({
  name: z.string().min(1, "name is required"),
  date: dateSchema,
  status: z.enum(attendanceStatuses).optional().default("present"),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const Route = createFileRoute("/api/attendance/mark")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startTime = Date.now();
        try {
          // Intentionally unauthenticated for the external attendance service.
          // Add API-key / service auth before exposing publicly.
          const body = await request.json();
          const parsed = markBodySchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { name, date, status, checkInTime, checkOutTime, notes } =
            parsed.data;

          const members = await loadAllPrismicMembers();
          const match = matchMemberByName(members, name);

          if (match.status === "not_found") {
            return Response.json(
              {
                error: "Employee not found",
                message: `No Prismic employee matched name "${name.trim()}".`,
              },
              { status: 404 },
            );
          }

          if (match.status === "ambiguous") {
            return Response.json(
              {
                error: "Ambiguous name",
                message: `Multiple employees matched name "${name.trim()}".`,
                matches: match.matches.map((m) => ({
                  uid: m.uid,
                  name: m.name,
                  kind: m.kind,
                  title: m.title,
                })),
              },
              { status: 409 },
            );
          }

          const { member } = match;
          const markedBy = await resolveAttendanceServiceUserId();

          const record = await upsertAttendanceRecord(
            {
              prismicUid: member.uid,
              date,
              status,
              checkInTime: checkInTime ?? null,
              checkOutTime: checkOutTime ?? null,
              notes: notes ?? null,
            },
            markedBy,
          );

          insertAuditLog({
            userId: markedBy,
            action: "mark_attendance_external",
            entityType: "attendance",
            entityId: member.uid,
            details: {
              date,
              status,
              name: member.name,
              prismicUid: member.uid,
              source: "external_api",
            },
          }).catch((error) =>
            console.error("Error inserting audit log:", error),
          );

          console.info(
            JSON.stringify({
              event: "attendance_marked_external",
              date,
              status,
              name: member.name,
              prismicUid: member.uid,
              durationMs: Date.now() - startTime,
            }),
          );

          return Response.json(
            {
              success: true,
              data: {
                attendance: record,
                member: {
                  uid: member.uid,
                  name: member.name,
                  kind: member.kind,
                  title: member.title,
                  department: member.department,
                },
              },
            },
            { status: 200 },
          );
        } catch (error) {
          console.error(
            `Error marking attendance after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to mark attendance",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
