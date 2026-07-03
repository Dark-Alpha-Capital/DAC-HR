import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSession } from "~/lib/get-session";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createHoliday,
  deleteHoliday,
  getHolidaysInRange,
} from "@workspace/db/repositories/holiday-repository";

const createBodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  name: z.string().min(1, "name is required"),
  description: z.string().nullable().optional(),
});

const deleteBodySchema = z.object({
  id: z.string().min(1),
});

export const Route = createFileRoute("/api/holidays")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const url = new URL(request.url);
          const start = url.searchParams.get("start") ?? "2000-01-01";
          const end = url.searchParams.get("end") ?? "2099-12-31";

          const holidays = await getHolidaysInRange(start, end);

          return Response.json({ holidays }, { status: 200 });
        } catch (error) {
          console.error("Error fetching holidays:", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
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
          const result = createBodySchema.safeParse(body);
          if (!result.success) {
            return Response.json(
              { error: result.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { date, name, description } = result.data;

          const holiday = await createHoliday(
            date,
            name,
            description ?? null,
            user.id,
          );

          insertAuditLog({
            userId: user.id,
            action: "create_holiday",
            entityType: "holiday",
            entityId: holiday.id,
            details: { date, name, description },
          }).catch((error) => console.error("Error inserting audit log:", error));

          console.info(
            JSON.stringify({
              event: "holiday_created",
              date,
              name,
              userId: user.id,
              durationMs: Date.now() - startTime,
            }),
          );

          return Response.json({ success: true, data: holiday }, { status: 201 });
        } catch (error) {
          console.error(`Error creating holiday after ${Date.now() - startTime}ms:`, error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Failed to create holiday" },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ request }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          const { user } = authSession;

          const body = await request.json();
          const result = deleteBodySchema.safeParse(body);
          if (!result.success) {
            return Response.json(
              { error: result.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          await deleteHoliday(result.data.id);

          insertAuditLog({
            userId: user.id,
            action: "delete_holiday",
            entityType: "holiday",
            entityId: result.data.id,
            details: {},
          }).catch((error) => console.error("Error inserting audit log:", error));

          console.info(
            JSON.stringify({
              event: "holiday_deleted",
              holidayId: result.data.id,
              userId: user.id,
              durationMs: Date.now() - startTime,
            }),
          );

          return Response.json({ success: true }, { status: 200 });
        } catch (error) {
          console.error(`Error deleting holiday after ${Date.now() - startTime}ms:`, error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Failed to delete holiday" },
            { status: 500 },
          );
        }
      },
    },
  },
});
