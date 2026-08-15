import { createFileRoute } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";
import {
  getInterviewAiAnalysesByInterviewId,
  deleteInterviewAiAnalysisForInterview,
} from "@workspace/db/repositories/interview-repository";
import { runAiAnalysis } from "#/features/interviews/run-ai-analysis";

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

          const result = await runAiAnalysis({
            scope: { kind: "interview", id: interviewId },
            screenerId,
            customPrompt,
          });

          if (result.error) {
            const status = result.error.endsWith("not found") ? 404 : 400;
            return Response.json({ error: result.error }, { status });
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
