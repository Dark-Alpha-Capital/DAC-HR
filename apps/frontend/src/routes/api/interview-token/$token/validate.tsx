import { createFileRoute } from "@tanstack/react-router";
import { assertInterviewTokenValid } from "@workspace/db/repositories/interview-session-repository";

export const Route = createFileRoute("/api/interview-token/$token/validate")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ valid: false, error: "Token is required" }, { status: 400 });
          }

          const validation = await assertInterviewTokenValid(token);

          if (!validation.ok) {
            return Response.json(
              { valid: false, error: validation.error },
              { status: validation.status },
            );
          }

          const { session, candidate, position, round } = validation.row;

          return Response.json({
            valid: true,
            sessionId: session.id,
            status: session.status,
            deliveryMode: session.deliveryMode,
            agentConfig: session.agentConfig,
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
