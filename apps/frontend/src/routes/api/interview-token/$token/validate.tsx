import { createFileRoute } from "@tanstack/react-router";
import { getSessionByToken } from "@workspace/db/repositories/interview-session-repository";

export const Route = createFileRoute("/api/interview-token/$token/validate")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ valid: false, error: "Token is required" }, { status: 400 });
          }

          const row = await getSessionByToken(token);

          if (!row) {
            return Response.json(
              { valid: false, error: "Interview not found" },
              { status: 404 },
            );
          }

          const { session, candidate, position, round } = row;

          if (session.status === "completed" || session.status === "reviewed") {
            return Response.json(
              {
                valid: false,
                error: "This interview has already been completed",
                status: session.status,
              },
              { status: 410 },
            );
          }

          // Only block on expiry if the candidate hasn't started yet.
          // Once in_progress, the 30-minute timer governs — link expiry is irrelevant.
          if (
            session.status !== "in_progress" &&
            new Date(session.expiresAt) < new Date()
          ) {
            return Response.json(
              {
                valid: false,
                error: "This interview link has expired",
                status: "expired",
              },
              { status: 410 },
            );
          }

          return Response.json({
            valid: true,
            sessionId: session.id,
            status: session.status,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            positionName: position.name,
            roundName: round.name,
          });
        } catch (error) {
          console.error("Error validating interview token:", error);
          return Response.json(
            { valid: false, error: "Failed to validate interview token" },
            { status: 500 },
          );
        }
      },
    },
  },
});
