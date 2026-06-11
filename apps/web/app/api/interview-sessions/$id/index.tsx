import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/lib/middleware/auth-guard";
import {
  getSessionById,
  getResponsesBySessionId,
  getEvaluationBySessionId,
} from "@workspace/db/repositories/interview-session-repository";

export const Route = createFileRoute("/api/interview-sessions/$id/")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const session = await getSession();
          if (!session?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          if (session.user.role !== "admin") {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const row = await getSessionById(params.id);

          if (!row) {
            return Response.json(
              { error: "Session not found" },
              { status: 404 },
            );
          }

          const responses = await getResponsesBySessionId(params.id);
          const evaluation = await getEvaluationBySessionId(params.id);

          return Response.json({
            session: row.session,
            application: row.application,
            candidate: row.candidate,
            position: row.position,
            round: row.round,
            responses,
            evaluation,
          });
        } catch (error) {
          console.error("Error fetching interview session detail:", error);
          return Response.json(
            { error: "Failed to fetch interview session detail" },
            { status: 500 },
          );
        }
      },
    },
  },
});
