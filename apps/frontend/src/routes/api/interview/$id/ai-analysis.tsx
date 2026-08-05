import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/get-session";
import {
  getApplicationById,
  saveInterviewAiAnalysis,
  getInterviewAiAnalysesByInterviewId,
} from "@workspace/db/repositories/interview-repository";
import {
  getInterviewById,
  deleteInterviewAiAnalysisForInterview,
} from "@workspace/db/repositories/interview-repository";
import { getScreenerById } from "@workspace/db/repositories/screener-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getAiModel } from "~/lib/ai/models";
import { generateText, Output } from "ai";
import { interviewAiAnalysisSchema } from "~/lib/schemas/interview-ai-analysis-schema";
import { buildInterviewAnalysisPrompt } from "~/lib/interview-analysis-prompt";

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

          const interviewId = params.id;
          if (!interviewId)
            return Response.json(
              { error: "Interview ID is required" },
              { status: 400 },
            );

          let body: { screenerId?: string; customPrompt?: string } = {};
          try {
            body = await request.json();
          } catch {
            /* ignore */
          }
          const { screenerId, customPrompt } = body;

          if (!screenerId?.trim()) {
            return Response.json(
              { error: "Screener is required" },
              { status: 400 },
            );
          }

          const screener = await getScreenerById(screenerId);
          if (!screener) {
            return Response.json(
              { error: "Screener not found" },
              { status: 404 },
            );
          }

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

          const candidate = await getCandidateById(application.candidateId);

          const prompt = await buildInterviewAnalysisPrompt({
            screener,
            interview,
            application: {
              position: application.position,
              candidate: candidate
                ? {
                    firstName: candidate.firstName,
                    lastName: candidate.lastName,
                  }
                : null,
            },
            customPrompt,
          });

          const { output: structuredData } = await generateText({
            model: getAiModel("gpt-4o-mini"),
            output: Output.object({ schema: interviewAiAnalysisSchema }),
            prompt,
          });

          const savedAnalysis = await saveInterviewAiAnalysis({
            interviewId,
            applicationId: application.id,
            positionId: application.position.id,
            screenerId: screener.id,
            analysis: structuredData.overallSummary,
            customPrompt: customPrompt || null,
            model: "gpt-4o-mini",
            structuredData,
          });

          return Response.json(
            {
              analysis: structuredData,
              analysisId: savedAnalysis?.id || null,
              screenerName: screener.name,
            },
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
          const body = (await request.json().catch(() => ({}))) as {
            analysisId?: string;
          };
          await deleteInterviewAiAnalysisForInterview(
            params.id,
            body.analysisId || "",
          );
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
