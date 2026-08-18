import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { interviewsService } from "#/features/interviews/server/interviews-service";
import { fetchSession as getSession } from "#/lib/auth-session";

const aiAnalysisBodySchema = z.object({
  screenerId: z.string().optional(),
  customPrompt: z.string().optional(),
});

const deleteAnalysisBodySchema = z.object({
  analysisId: z.string().optional(),
});

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

          const { analyses } = await interviewsService.getBundleAiAnalyses(
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

          const parsedBody = aiAnalysisBodySchema.safeParse(
            await request.json().catch(() => undefined),
          );
          const { screenerId, customPrompt } = parsedBody.success
            ? parsedBody.data
            : {};

          const result = await interviewsService.runSingleAiAnalysis({
            scope: { kind: "bundle", id: bundleId },
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

          const parsedDeleteBody = deleteAnalysisBodySchema.safeParse(
            await request.json().catch(() => undefined),
          );
          const analysisId = parsedDeleteBody.success
            ? parsedDeleteBody.data.analysisId
            : undefined;

          const result = await interviewsService.deleteBundleAnalysis(
            params.bundleId,
            analysisId || "",
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
