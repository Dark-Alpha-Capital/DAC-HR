import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "#/lib/get-session";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const Route = createFileRoute("/api/audit-logs/generate-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const { user } = authSession;

          const body = (await request.json()) as {
            action?: string;
            entityType?: string;
            entityId?: string;
            details?: unknown;
          };
          const { action, entityType, entityId, details } = body;

          if (!action || !entityType || !entityId) {
            return Response.json(
              { error: "action, entityType, and entityId are required" },
              { status: 400 },
            );
          }

          const audit = await insertAuditLog({
            userId: user.id,
            action,
            entityType,
            entityId,
            details: (details || {}) as Record<string, unknown>,
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
