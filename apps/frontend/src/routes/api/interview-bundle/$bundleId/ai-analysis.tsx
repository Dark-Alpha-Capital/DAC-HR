import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/get-session";
import {
  getApplicationById,
  saveInterviewAiAnalysis,
  getInterviewAiAnalysesByBundleId,
} from "@workspace/db/queries";
import { deleteInterviewAiAnalysisForBundle } from "@workspace/db/repositories/interview-repository";
import {
  getBundleById,
  getBundleRounds,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getScreenerById } from "@workspace/db/repositories/screener-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getAiModel } from "~/lib/ai/models";
import { generateText, Output } from "ai";
import { interviewAiAnalysisSchema } from "~/lib/schemas/interview-ai-analysis-schema";
import { buildBundleInterviewAnalysisPrompt } from "~/lib/interview-analysis-prompt";

export const Route = createFileRoute(
  "/api/interview-bundle/$bundleId/ai-analysis",
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const analyses = await getInterviewAiAnalysesByBundleId(
            params.bundleId,
          );
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
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const bundleId = params.bundleId;
          if (!bundleId) {
            return Response.json(
              { error: "Bundle ID is required" },
              { status: 400 },
            );
          }

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

          const bundle = await getBundleById(bundleId);
          if (!bundle) {
            return Response.json({ error: "Bundle not found" }, { status: 404 });
          }

          const rounds = await getBundleRounds(bundleId);
          if (rounds.length === 0) {
            return Response.json(
              { error: "Bundle has no rounds configured" },
              { status: 400 },
            );
          }

          const application = await getApplicationById(bundle.applicationId);
          if (!application) {
            return Response.json(
              { error: "Application not found" },
              { status: 404 },
            );
          }

          const candidate = await getCandidateById(application.candidateId);
          const anchorInterviewId = rounds[0]!.bundleRound.interviewId;

          const prompt = await buildBundleInterviewAnalysisPrompt({
            screener,
            bundleId,
            roundCount: rounds.length,
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
            interviewId: anchorInterviewId,
            bundleId,
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
            `Bundle AI analysis error after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            { error: "Failed to analyze interview bundle" },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = (await request.json().catch(() => ({}))) as {
            analysisId?: string;
          };

          const result = await deleteInterviewAiAnalysisForBundle(
            params.bundleId,
            body.analysisId || "",
          );

          if (!result.deleted) {
            return Response.json(
              { error: "Analysis not found" },
              { status: 404 },
            );
          }

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
