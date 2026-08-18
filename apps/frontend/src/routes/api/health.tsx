import { createFileRoute } from "@tanstack/react-router";
import { sql } from "@workspace/db";
import { db } from "@workspace/db/db";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        let dbStatus: "ok" | "error" = "ok";
        let dbError: string | undefined;

        try {
          await db.run(sql`SELECT 1`);
        } catch (error) {
          dbStatus = "error";
          dbError =
            error instanceof Error
              ? error.message || error.stack || "unknown D1 error"
              : String(error);
          console.error("[health] D1 ping failed:", error);
        }

        return Response.json(
          {
            status: dbStatus === "ok" ? "healthy" : "degraded",
            db: dbStatus,
            dbError,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
          },
          { status: dbStatus === "ok" ? 200 : 503 },
        );
      },
    },
  },
});
