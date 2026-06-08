import { createFileRoute } from "@tanstack/react-router";
import {
  getApplicationById,
  saveInterviewAiAnalysis,
  getInterviewAiAnalysesByInterviewId,
} from "@workspace/db/queries";
import {
  getInterviewById,
  deleteInterviewAiAnalysisForInterview,
} from "@workspace/db/repositories/interview-repository";
import { googleAIClient } from "@/lib/ai/models";
import { getSession } from "@/lib/middleware/auth-guard";
import { generateText, Output } from "ai";
import { interviewAiAnalysisSchema } from "@/lib/schemas/interview-ai-analysis-schema";

export const Route = createFileRoute("/api/interview/$id/ai-analysis")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const analyses = await getInterviewAiAnalysesByInterviewId(params.id);
          return Response.json({ analyses }, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            { status: 500 },
          );
        }
      },

      POST: async ({ request, params }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const { user } = authSession;

          const interviewId = params.id;
          if (!interviewId)
            return Response.json(
              { error: "Interview ID is required" },
              { status: 400 },
            );

          let body: { customPrompt?: string } = {};
          try {
            body = await request.json();
          } catch {
            /* ignore */
          }
          const { customPrompt } = body;

          const interview = await getInterviewById(interviewId);
          if (!interview)
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );

          const application = await getApplicationById(interview.applicationId);
          if (!application)
            return Response.json(
              { error: "Application not found" },
              { status: 404 },
            );

          const questionsText = interview.questions
            .map(
              (q, i) =>
                `${i + 1}. ${q.questionText}${q.feedback?.rating ? ` | Rating: ${q.feedback.rating}/5` : ""}${q.feedback?.notes ? ` | Notes: ${q.feedback.notes}` : ""}`,
            )
            .join("\n");

          const prompt = [
            `Position: ${application.position.name}${application.position.description ? ` - ${application.position.description}` : ""}`,
            `Round: ${interview.roundTemplate.name} | Status: ${interview.status}${interview.rating ? ` | Rating: ${interview.rating}/5` : ""}`,
            interview.overallFeedback
              ? `Overall: ${interview.overallFeedback}`
              : null,
            questionsText,
            customPrompt?.trim() ? `Additional: ${customPrompt.trim()}` : null,
            "Analyze: performance, alignment, strengths/concerns, per-question breakdown, recommendation.",
          ]
            .filter(Boolean)
            .join("\n\n");

          const { output: structuredData } = await generateText({
            model: googleAIClient("gemini-2.5-flash"),
            output: Output.object({ schema: interviewAiAnalysisSchema }),
            prompt,
          });

          const savedAnalysis = await saveInterviewAiAnalysis({
            interviewId,
            applicationId: application.id,
            positionId: application.position.id,
            analysis: structuredData.overallSummary,
            customPrompt: customPrompt || null,
            model: "gemini-2.5-flash",
            structuredData,
          });

          return Response.json(
            { analysis: structuredData, analysisId: savedAnalysis?.id || null },
            { status: 200 },
          );
        } catch (error) {
          console.error(
            `Interview AI analysis error after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            { error: "Failed to analyze interview" },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const body = await request.json().catch(() => ({})) as { analysisId?: string };
          await deleteInterviewAiAnalysisForInterview(params.id, body.analysisId || "");
          return Response.json({ success: true }, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
