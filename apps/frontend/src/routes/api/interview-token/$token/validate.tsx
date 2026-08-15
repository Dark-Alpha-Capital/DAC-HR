import { createFileRoute } from "@tanstack/react-router";
import { assertInterviewTokenValid } from "@workspace/db/repositories/interview-bundle-repository";
import { resolveSessionFromToken } from "@workspace/db/repositories/interview-bundle-repository";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";

const COMPONENT = "validate-api";

export const Route = createFileRoute("/api/interview-token/$token/validate")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { token } = params;

          if (!token) {
            interviewServerLog.warn("validate", COMPONENT, "token_missing");
            return Response.json(
              { valid: false, error: "Token is required" },
              { status: 400 },
            );
          }

          interviewServerLog.info("validate", COMPONENT, "validate_start", {
            token: truncateId(token),
          });

          const validation = await assertInterviewTokenValid(token);

          if (!validation.ok) {
            interviewServerLog.warn("validate", COMPONENT, "token_invalid", {
              token: truncateId(token),
              status: validation.status,
              error: validation.error,
            });
            return Response.json(
              { valid: false, error: validation.error },
              { status: validation.status },
            );
          }

          if (validation.type === "bundle") {
            const activeRound = validation.activeRound;
            const session = activeRound?.session;

            interviewServerLog.success("bundle", COMPONENT, "validate_ok", {
              token: truncateId(token),
              type: "bundle",
              bundleId: truncateId(validation.bundle.bundle.id),
              sessionId: truncateId(session?.id),
              currentRoundIndex: validation.currentRoundIndex,
              totalRounds: validation.rounds.length,
              deliveryMode: activeRound?.bundleRound.deliveryMode,
            });

            return Response.json({
              valid: true,
              type: "bundle",
              bundleId: validation.bundle.bundle.id,
              status: validation.bundle.bundle.status,
              candidateName: `${validation.bundle.candidate.firstName} ${validation.bundle.candidate.lastName}`,
              candidateEmail: validation.bundle.candidate.email,
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
                sessionId: r.session.id,
              })),
              sessionId: session?.id,
              roundName: activeRound?.round.name,
              deliveryMode: activeRound?.bundleRound.deliveryMode,
            });
          }

          const resolved = await resolveSessionFromToken(token);
          if (!resolved.ok || resolved.type !== "legacy") {
            interviewServerLog.warn("validate", COMPONENT, "legacy_not_found", {
              token: truncateId(token),
            });
            return Response.json(
              { valid: false, error: "Interview not found" },
              { status: 404 },
            );
          }

          const { session, candidate, position, round } = resolved.row;

          interviewServerLog.success("validate", COMPONENT, "validate_ok", {
            token: truncateId(token),
            type: "legacy",
            sessionId: truncateId(session.id),
            deliveryMode: session.deliveryMode,
            status: session.status,
          });

          return Response.json({
            valid: true,
            type: "legacy",
            sessionId: session.id,
            status: session.status,
            deliveryMode: session.deliveryMode,
            agentConfig: session.agentConfig,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            candidateEmail: candidate.email,
            positionName: position.name,
            roundName: round.name,
          });
        } catch (error) {
          interviewServerLog.error("validate", COMPONENT, "validate_failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return Response.json(
            { valid: false, error: "Failed to validate interview token" },
            { status: 500 },
          );
        }
      },
    },
  },
});
