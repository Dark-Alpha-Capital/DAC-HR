import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionByToken, getResponseBySessionAndQuestion, createResponse } from "@workspace/db/repositories/interview-session-repository";

const answerSchema = z.object({
  questionId: z.string().min(1),
  answerText: z.string().min(1, "Answer cannot be empty"),
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
          const parsed = answerSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { questionId, answerText } = parsed.data;

          const existing = await getResponseBySessionAndQuestion(
            session.id,
            questionId,
          );

          if (existing) {
            return Response.json(
              { error: "You have already answered this question" },
              { status: 409 },
            );
          }

          const response = await createResponse({
            sessionId: session.id,
            questionId,
            answerText,
          });

          return Response.json({ response }, { status: 201 });
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
