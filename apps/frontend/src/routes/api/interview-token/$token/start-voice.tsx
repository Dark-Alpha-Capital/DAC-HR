import { createFileRoute } from "@tanstack/react-router";
import { createRealtimeEphemeralSession } from "@workspace/ai-config";
import { getQuestionsForInterviewSession } from "@workspace/db/queries";
import {
  assertInterviewTokenValid,
  updateSessionStatus,
} from "@workspace/db/repositories/interview-session-repository";
import { PRACTICE_QUESTIONS } from "@workspace/interview-realtime";
import { buildRealtimeInstructions } from "@workspace/interview-realtime/prompts";

export const Route = createFileRoute("/api/interview-token/$token/start-voice")(
  {
    server: {
      handlers: {
        POST: async ({ params, request }) => {
          try {
            const { token } = params;

            if (!token) {
              return Response.json(
                { error: "Token is required" },
                { status: 400 },
              );
            }

            const body = (await request.json().catch(() => null)) as
              | { practice?: boolean }
              | null;
            const isPractice = body?.practice === true;

            const validation = await assertInterviewTokenValid(token);
            if (!validation.ok) {
              return Response.json(
                { error: validation.error },
                { status: validation.status },
              );
            }

            const { session, candidate, position, round } = validation.row;

            if (
              session.deliveryMode !== "voice" &&
              session.deliveryMode !== "hybrid"
            ) {
              return Response.json(
                { error: "Voice interviews are not enabled for this session" },
                { status: 400 },
              );
            }

            const candidateName = `${candidate.firstName} ${candidate.lastName}`;
            const questions = isPractice
              ? PRACTICE_QUESTIONS
              : await getQuestionsForInterviewSession(
                  session.roundId,
                  session.id,
                );

            if (
              !isPractice &&
              (session.status === "pending" || session.status === "invited")
            ) {
              await updateSessionStatus(session.id, "in_progress", {
                startedAt: new Date(),
              });
            }

            const practiceInstructions = [
              session.agentConfig?.instructions?.trim(),
              "This is a PRACTICE session with sample questions. Answers are not recorded or evaluated for hiring. Keep the tone supportive and explain this is practice if asked.",
            ]
              .filter(Boolean)
              .join(" ");

            const instructions = buildRealtimeInstructions({
              roundName: isPractice ? "Practice Session" : round.name,
              positionName: position.name,
              candidateName,
              questions: questions.map((question) => ({
                id: question.id,
                questionText: question.questionText,
                questionType: question.questionType,
                category: question.category,
                options: question.options,
              })),
              agentConfig: isPractice
                ? {
                    provider: "openai" as const,
                    ...session.agentConfig,
                    instructions: practiceInstructions,
                  }
                : (session.agentConfig ?? undefined),
            });

            const ephemeral = await createRealtimeEphemeralSession({
              voice: session.agentConfig?.voice,
              instructions,
            });

            const origin = new URL(request.url).origin;
            const wsUrl = `${origin.replace(/^http/, "ws")}/api/interview-realtime/ws?token=${encodeURIComponent(token)}${isPractice ? "&practice=1" : ""}`;

            return Response.json({
              clientSecret: ephemeral.clientSecret,
              sessionId: session.id,
              realtimeSessionId: ephemeral.id,
              model: ephemeral.model,
              wsUrl,
              isPractice,
              agentConfig: session.agentConfig,
              questions: questions.map((question) => ({
                id: question.id,
                questionText: question.questionText,
                questionType: question.questionType,
                category: question.category,
                timeLimitSeconds: question.timeLimitSeconds,
                options:
                  question.questionType === "mcq" ? question.options : null,
              })),
            });
          } catch (error) {
            console.error("Error starting voice session:", error);
            return Response.json(
              { error: "Failed to start voice session" },
              { status: 500 },
            );
          }
        },
      },
    },
  },
);
