import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { fetchSession as getSession } from "#/lib/auth-session";
import { saveCandidateAiScreening } from "@workspace/db/repositories/candidate-repository";
import { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import { getOpenAIProvider, generateEmbedding } from "@workspace/ai-config";
import { generateText, Output } from "ai";
import { candidateAiScreeningSchema } from "#/features/applications/schemas";

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

          let documentInstruction = "Search all candidate documents.";
          if (documentIds?.length) {
            documentInstruction = `Focus on ${documentIds.length} selected document(s).`;
          }

          let customPromptSection = "";
          if (customPrompt?.trim())
            customPromptSection = `\n\nUser requirements: ${customPrompt.trim()}`;

          const analysisPrompt =
            `Evaluate candidate fit for Dark Alpha Capital's position.

${documentInstruction}

Candidate: ${candidateRecord.firstName} ${candidateRecord.lastName} (${candidateRecord.email})
Position: ${targetPosition?.name || "General"}
${customPromptSection}

Provide concise markdown analysis: background, skills, experience fit, culture fit, suitability.`.trim();

          const queryEmbedding = await generateEmbedding(analysisPrompt);

          const namespace = `candidate-${candidateId}`;
          const filter = documentIds?.length
            ? { documentId: { $in: documentIds } }
            : undefined;

          const matches = await (
            env
          ).VECTORIZE && typeof (env).VECTORIZE === "object"
            ? await (
                (env).VECTORIZE as {
                  query: (
                    vector: number[],
                    opts: {
                      topK: number;
                      namespace: string;
                      returnMetadata: string;
                      filter?: Record<string, { $in: string[] }>;
                    },
                  ) => Promise<{
                    matches: Array<{ metadata?: { text?: string } }>;
                  }>;
                }
              ).query(queryEmbedding, {
                topK: 10,
                namespace,
                returnMetadata: "indexed",
                filter,
              })
            : { matches: [] };

          const contextChunks = matches.matches
            .map((m) => m.metadata?.text)
            .filter(Boolean) as string[];
          const context = contextChunks.join("\n\n");

          const openai = getOpenAIProvider();
          const { output: structuredData } = await generateText({
            model: openai("gpt-4o-mini"),
            output: Output.object({ schema: candidateAiScreeningSchema }),
            prompt: `Context from candidate documents:\n${context || "No document context available."}\n\nAnalysis request:\n${analysisPrompt}`,
          });

          const savedScreening = await saveCandidateAiScreening({
            candidateId,
            positionId: targetApplication?.position.id || null,
            applicationId: targetApplication?.id || null,
            analysis: analysisPrompt,
            model: "gpt-4o-mini",
            structuredData,
          });

          return Response.json(
            {
              analysis: analysisPrompt,
              score: structuredData.score,
              screeningId: savedScreening?.id || null,
              contextChunks: contextChunks.length,
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
