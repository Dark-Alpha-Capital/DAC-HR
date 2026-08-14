import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "#/lib/get-session";
import { getInterviewAiAnalysesByBundleId } from "@workspace/db/repositories/interview-repository";
import { deleteInterviewAiAnalysisForBundle } from "@workspace/db/repositories/interview-repository";
import { runBundleAiAnalysisWithScreener } from "#/features/interviews/run-bundle-ai-analysis";

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

          const result = await runBundleAiAnalysisWithScreener({
            bundleId,
            screenerId,
            customPrompt,
          });

          if (result.error) {
            return Response.json({ error: result.error }, { status: 400 });
          }

          return Response.json(
            {
              analysis: result.analysis,
              analysisId: result.analysisId,
              screenerName: result.screenerName,
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
