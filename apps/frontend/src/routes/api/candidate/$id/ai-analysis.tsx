import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { fetchSession as getSession } from "#/lib/auth-session";
import { candidatesService } from "#/features/candidates/server/candidates-service";
import { getOpenAIProvider, generateEmbedding } from "@workspace/ai-config";
import { generateText, Output } from "ai";
import { candidateAiScreeningSchema } from "#/features/applications/schemas";

const aiAnalysisBodySchema = z.object({
  positionId: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  customPrompt: z.string().optional(),
});

export const Route = createFileRoute("/api/candidate/$id/ai-analysis")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });

          const candidateId = params.id;
          if (!candidateId)
            return Response.json(
              { error: "Candidate ID is required" },
              { status: 400 },
            );

          const parsedBody = aiAnalysisBodySchema.safeParse(
            await request.json().catch(() => undefined),
          );
          const { positionId, documentIds, customPrompt } = parsedBody.success
            ? parsedBody.data
            : {};
          const candidateRecord =
            await candidatesService.getCandidateWithApplications(candidateId);
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

          const matches = env.VECTORIZE
            ? await env.VECTORIZE.query(queryEmbedding, {
                topK: 10,
                namespace,
                returnMetadata: "indexed",
                filter,
              })
            : { matches: [] };

          // SAFETY: the document-indexing workflow stores `text` (a string) in
          // each vector's metadata, so non-falsy metadata.text values are strings.
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

          const savedScreening = await candidatesService.saveAiScreening({
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
