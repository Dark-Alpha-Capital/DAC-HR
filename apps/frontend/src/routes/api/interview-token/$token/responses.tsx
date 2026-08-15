import { createFileRoute } from "@tanstack/react-router";
import { interviewsService } from "#/features/interviews/server/interviews-service";
import { z } from "zod";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";

const COMPONENT = "responses-api";

const answerRequestSchema = z.object({
  questionId: z.string().min(1),
  answerText: z.string().optional(),
  selectedOptionId: z.string().optional(),
});

export const Route = createFileRoute("/api/interview-token/$token/responses")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { token } = params;

          if (!token) {
            interviewServerLog.warn("form", COMPONENT, "token_missing");
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const resolved = await interviewsService.resolveToken(token);

          if (!resolved.ok) {
            interviewServerLog.warn("form", COMPONENT, "token_resolve_failed", {
              token: truncateId(token),
              error: resolved.error,
            });
            return Response.json(
              { error: resolved.error },
              { status: resolved.status },
            );
          }

          const { session } = resolved;

          if (session.status === "completed" || session.status === "reviewed") {
            interviewServerLog.warn("form", COMPONENT, "round_already_completed", {
              sessionId: truncateId(session.id),
            });
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

          const body = await request.json();
          const parsed = answerRequestSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { questionId, answerText, selectedOptionId } = parsed.data;
          const question = await interviewsService.getQuestionById(questionId);

          if (!question) {
            return Response.json({ error: "Question not found" }, { status: 404 });
          }

          if (resolved.type === "bundle") {
            const roundQuestions = await interviewsService.getSessionQuestions(
              session.roundId,
            );
            const belongsToRound = roundQuestions.some(
              (q) => q.id === questionId,
            );
            if (!belongsToRound) {
              interviewServerLog.warn(
                "form",
                COMPONENT,
                "cross_round_answer_rejected",
                {
                  sessionId: truncateId(session.id),
                  roundId: truncateId(session.roundId),
                  questionId: truncateId(questionId),
                },
              );
              return Response.json(
                { error: "Question does not belong to this round" },
                { status: 400 },
              );
            }
          }

          if (question.questionType === "mcq") {
            if (!selectedOptionId) {
              return Response.json(
                { error: { selectedOptionId: ["Please select an option"] } },
                { status: 400 },
              );
            }

            const validOption = question.options?.some(
              (option) => option.id === selectedOptionId,
            );

            if (!validOption) {
              return Response.json(
                { error: { selectedOptionId: ["Invalid option selected"] } },
                { status: 400 },
              );
            }

            const response = await interviewsService.upsertResponse({
              sessionId: session.id,
              questionId,
              answerText: null,
              selectedOptionId,
              inputMethod: "mcq",
            });

            interviewServerLog.success("form", COMPONENT, "response_saved", {
              sessionId: truncateId(session.id),
              questionId: truncateId(questionId),
              inputMethod: "mcq",
            });

            return Response.json({ response }, { status: 200 });
          }

          if (!answerText?.trim()) {
            return Response.json(
              { error: { answerText: ["Answer cannot be empty"] } },
              { status: 400 },
            );
          }

          const response = await interviewsService.upsertResponse({
            sessionId: session.id,
            questionId,
            answerText: answerText.trim(),
            selectedOptionId: null,
            inputMethod: "typed",
          });

          interviewServerLog.success("form", COMPONENT, "response_saved", {
            sessionId: truncateId(session.id),
            questionId: truncateId(questionId),
            inputMethod: "typed",
          });

          return Response.json({ response }, { status: 200 });
        } catch (error) {
          interviewServerLog.error("form", COMPONENT, "response_save_failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return Response.json(
            { error: "Failed to save response" },
            { status: 500 },
          );
        }
      },
    },
  },
});
