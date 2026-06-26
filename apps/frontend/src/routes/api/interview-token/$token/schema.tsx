import { createFileRoute } from "@tanstack/react-router";
import {
  updateSessionStatus,
} from "@workspace/db/repositories/interview-session-repository";
import {
  startBundleRound,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getQuestionsForInterviewSession } from "@workspace/db/queries";
import { resolveInterviewToken } from "~/lib/interview-token";

export const Route = createFileRoute("/api/interview-token/$token/schema")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const resolved = await resolveInterviewToken(token);

          if (!resolved.ok) {
            return Response.json(
              { error: resolved.error },
              { status: resolved.status },
            );
          }

          const { session, candidate, position, round } = resolved;

          if (session.status === "completed" || session.status === "reviewed") {
            return Response.json(
              { error: "This interview round has already been completed" },
              { status: 410 },
            );
          }

          if (new Date(session.expiresAt) < new Date()) {
            return Response.json(
              { error: "This interview link has expired" },
              { status: 410 },
            );
          }

          if (resolved.type === "bundle" && resolved.deliveryMode !== "form") {
            return Response.json(
              { error: "This round uses voice mode" },
              { status: 400 },
            );
          }

          const questions = await getQuestionsForInterviewSession(
            session.roundId,
            session.id,
          );

          if (session.status === "pending" || session.status === "invited") {
            if (resolved.type === "bundle") {
              const activeRound = resolved.rounds.find(
                (r) => r.session.id === session.id,
              );
              if (activeRound) {
                await startBundleRound(activeRound.bundleRound.id).catch((e) =>
                  console.error("Failed to start bundle round:", e),
                );
              }
            } else {
              await updateSessionStatus(session.id, "in_progress", {
                startedAt: new Date(),
              }).catch((e) =>
                console.error("Failed to update session status:", e),
              );
            }
          }

          return Response.json({
            sessionId: session.id,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            positionName: position.name,
            roundName: round.name,
            type: resolved.type,
            currentRoundIndex: resolved.type === "bundle" ? resolved.currentRoundIndex : 0,
            totalRounds: resolved.type === "bundle" ? resolved.totalRounds : 1,
            deliveryMode:
              resolved.type === "bundle"
                ? resolved.deliveryMode
                : session.deliveryMode,
            questions: questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              questionType: q.questionType,
              category: q.category,
              timeLimitSeconds: q.timeLimitSeconds,
              options: q.questionType === "mcq" ? q.options : null,
            })),
          });
        } catch (error) {
          console.error("Error fetching interview schema:", error);
          return Response.json(
            { error: "Failed to fetch interview schema" },
            { status: 500 },
          );
        }
      },
    },
  },
});
