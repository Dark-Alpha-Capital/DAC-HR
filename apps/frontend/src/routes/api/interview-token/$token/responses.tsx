import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getSessionByToken,
  upsertResponse,
} from "@workspace/db/repositories/interview-session-repository";
import { getQuestionById } from "@workspace/db/queries";

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
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const row = await getSessionByToken(token);

          if (!row) {
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );
          }

          const { session } = row;

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

          const body = await request.json();
          const parsed = answerRequestSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { questionId, answerText, selectedOptionId } = parsed.data;
          const question = await getQuestionById(questionId);

          if (!question) {
            return Response.json({ error: "Question not found" }, { status: 404 });
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

            const response = await upsertResponse({
              sessionId: session.id,
              questionId,
              answerText: null,
              selectedOptionId,
            });

            return Response.json({ response }, { status: 200 });
          }

          if (!answerText?.trim()) {
            return Response.json(
              { error: { answerText: ["Answer cannot be empty"] } },
              { status: 400 },
            );
          }

          const response = await upsertResponse({
            sessionId: session.id,
            questionId,
            answerText: answerText.trim(),
            selectedOptionId: null,
          });

          return Response.json({ response }, { status: 200 });
        } catch (error) {
          console.error("Error saving interview response:", error);
          return Response.json(
            { error: "Failed to save response" },
            { status: 500 },
          );
        }
      },
    },
  },
});
