import { createFileRoute } from "@tanstack/react-router";
import { saveCandidateAiScreening } from "@workspace/db/queries";
import { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import {
  createFileSearchClient,
  generateContentWithFileSearch,
} from "@workspace/file-search";
import { googleAIClient, CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME } from "@/lib/ai/models";
import { getSession } from "@/lib/middleware/auth-guard";
import { generateText, Output } from "ai";
import { candidateAiScreeningSchema } from "@/lib/schemas/candidate-ai-screening-schema";

export const Route = createFileRoute("/api/candidate/$id/ai-analysis")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const { user } = authSession;

          const candidateId = params.id;
          if (!candidateId)
            return Response.json(
              { error: "Candidate ID is required" },
              { status: 400 },
            );

          let body: {
            positionId?: string;
            documentIds?: string[];
            customPrompt?: string;
          } = {};
          try {
            body = await request.json();
          } catch {
            /* no body */
          }

          const { positionId, documentIds, customPrompt } = body;
          const candidateRecord =
            await getCandidateWithApplications(candidateId);
          if (!candidateRecord)
            return Response.json(
              { error: "Candidate not found" },
              { status: 404 },
            );

          const targetApplication = positionId
            ? candidateRecord.applications.find(
                (app) => app.position.id === positionId,
              )
            : candidateRecord.applications[0] || null;

          const targetPosition = targetApplication?.position ?? null;
          const storeName = CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME;
          let documentInstruction = "Search all candidate documents.";
          if (documentIds?.length) {
            documentInstruction = `Focus on ${documentIds.length} selected document(s).`;
          }

          let customPromptSection = "";
          if (customPrompt?.trim())
            customPromptSection = `\n\nUser requirements: ${customPrompt.trim()}`;

          const rawAnalysisPrompt =
            `Evaluate candidate fit for Dark Alpha Capital's position.

${documentInstruction}

Candidate: ${candidateRecord.firstName} ${candidateRecord.lastName} (${candidateRecord.email})
Position: ${targetPosition?.name || "General"}
${customPromptSection}

Provide concise markdown analysis: background, skills, experience fit, culture fit, suitability.`.trim();

          const fileSearchClient = createFileSearchClient();
          const rawAnalysisResponse = await generateContentWithFileSearch({
            client: fileSearchClient,
            model: "gemini-2.5-flash",
            prompt: rawAnalysisPrompt,
            fileSearchStoreNames: [storeName],
            metadataFilter: `candidate_id="${candidateId}"`,
          });

          const rawAnalysisText = rawAnalysisResponse.text || "";

          const { output: structuredData } = await generateText({
            model: googleAIClient("gemini-3-flash-preview"),
            output: Output.object({ schema: candidateAiScreeningSchema }),
            prompt: `Extract structured evaluation: score (0-10), recommendation, markdown analysis, strengths (3-7), concerns, experience/skills/culture fit.\n\n${rawAnalysisText}`,
          });

          const savedScreening = await saveCandidateAiScreening({
            candidateId,
            positionId: targetApplication?.position.id || null,
            applicationId: targetApplication?.id || null,
            analysis: rawAnalysisText,
            model: "gemini-3-flash-preview",
            structuredData,
          });

          return Response.json(
            {
              analysis: rawAnalysisText,
              score: structuredData.score,
              screeningId: savedScreening?.id || null,
            },
            { status: 200 },
          );
        } catch (error) {
          console.error(
            `AI analysis error after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            { error: "Failed to analyze candidate" },
            { status: 500 },
          );
        }
      },
    },
  },
});
