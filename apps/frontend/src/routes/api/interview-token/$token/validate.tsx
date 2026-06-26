import { createFileRoute } from "@tanstack/react-router";
import { assertInterviewTokenValid } from "@workspace/db/repositories/interview-session-repository";
import { resolveSessionFromToken } from "@workspace/db/repositories/interview-bundle-repository";

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

          if (validation.type === "bundle") {
            const activeRound = validation.activeRound;
            const session = activeRound?.session;

            return Response.json({
              valid: true,
              type: "bundle",
              bundleId: validation.bundle.bundle.id,
              status: validation.bundle.bundle.status,
              candidateName: `${validation.bundle.candidate.firstName} ${validation.bundle.candidate.lastName}`,
              positionName: validation.bundle.position.name,
              currentRoundIndex: validation.currentRoundIndex,
              totalRounds: validation.rounds.length,
              rounds: validation.rounds.map((r) => ({
                id: r.bundleRound.id,
                roundId: r.round.id,
                roundName: r.round.name,
                roundOrder: r.bundleRound.roundOrder,
                deliveryMode: r.bundleRound.deliveryMode,
                status: r.bundleRound.status,
              })),
              sessionId: session?.id,
              roundName: activeRound?.round.name,
              deliveryMode: activeRound?.bundleRound.deliveryMode,
            });
          }

          const resolved = await resolveSessionFromToken(token);
          if (!resolved.ok || resolved.type !== "legacy") {
            return Response.json(
              { valid: false, error: "Interview not found" },
              { status: 404 },
            );
          }

          const { session, candidate, position, round } = resolved.row;

          return Response.json({
            valid: true,
            type: "legacy",
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
