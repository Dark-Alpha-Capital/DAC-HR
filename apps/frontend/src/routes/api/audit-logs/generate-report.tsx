import { createFileRoute } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";
import { adminService } from "#/features/admin/server/admin-service";
import { z } from "zod";

const auditReportBodySchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/audit-logs/generate-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const { user } = authSession;

          const parsedBody = auditReportBodySchema.safeParse(
            await request.json(),
          );
          if (!parsedBody.success) {
            return Response.json(
              { error: "Invalid request body" },
              { status: 400 },
            );
          }
          const { action, entityType, entityId, details } = parsedBody.data;

          if (!action || !entityType || !entityId) {
            return Response.json(
              { error: "action, entityType, and entityId are required" },
              { status: 400 },
            );
          }

          const audit = await adminService.insertAuditLog({
            userId: user.id,
            action,
            entityType,
            entityId,
            details: details ?? {},
          });

          return Response.json(
            { success: true, auditLog: audit },
            { status: 201 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to generate report",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
