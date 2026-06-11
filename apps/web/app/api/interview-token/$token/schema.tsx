import { createFileRoute } from "@tanstack/react-router";
import { getSessionByToken, updateSessionStatus } from "@workspace/db/repositories/interview-session-repository";
import { getQuestionsForInterviewSession } from "@workspace/db/queries";

export const Route = createFileRoute("/api/interview-token/$token/schema")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const row = await getSessionByToken(token);

          if (!row) {
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );
          }

          const { session, candidate, position, round } = row;

          if (session.status === "completed" || session.status === "reviewed") {
            return Response.json(
              { error: "This interview has already been completed" },
              { status: 410 },
            );
          }

          if (new Date(session.expiresAt) < new Date()) {
            return Response.json(
              { error: "This interview link has expired" },
              { status: 410 },
            );
          }

          const questions = await getQuestionsForInterviewSession(
            session.roundId,
            session.id,
          );

          if (session.status === "pending" || session.status === "invited") {
            await updateSessionStatus(session.id, "in_progress", {
              startedAt: new Date(),
            }).catch((e) => console.error("Failed to update session status:", e));
          }

          return Response.json({
            sessionId: session.id,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            positionName: position.name,
            roundName: round.name,
            questions: questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              questionType: q.questionType,
              category: q.category,
              timeLimitSeconds: q.timeLimitSeconds,
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
