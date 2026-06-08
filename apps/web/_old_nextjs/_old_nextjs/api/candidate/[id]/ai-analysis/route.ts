import { NextRequest, NextResponse } from "next/server";
import { saveCandidateAiScreening } from "@workspace/db/queries";
import { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import {
  createFileSearchClient,
  generateContentWithFileSearch,
} from "@workspace/file-search";
import {
  CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
  googleAIClient,
} from "@/lib/ai/models";
import { requireAuth } from "@/lib/middleware/auth";
import { generateText, Output } from "ai";
import { candidateAiScreeningSchema } from "@/lib/schemas/candidate-ai-screening-schema";

/**
 * AI analysis endpoint
 *
 * - Fetches full candidate record (including applications and positions)
 * - Optionally focuses on a specific position/application (via positionId)
 * - Uses Gemini + File Search over candidate documents
 * - Returns a detailed suitability report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult; // Unauthorized response
    }
    const { user } = authResult;

    const { id: candidateId } = await params;
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Starting AI analysis for candidate ${candidateId} - User: ${user?.email || "unknown"} (${user?.id || "unknown"})`,
    );

    if (!candidateId) {
      console.error(
        "[POST /api/candidate/:id/ai-analysis] Missing candidate ID",
      );
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 },
      );
    }

    let body: {
      positionId?: string;
      documentIds?: string[];
      customPrompt?: string;
    } = {};
    try {
      body = await request.json();
    } catch {
      // Ignore JSON parse errors – treat as no body / no positionId
      console.log(
        "[POST /api/candidate/:id/ai-analysis] No request body provided, proceeding without positionId",
      );
    }

    const { positionId, documentIds, customPrompt } = body;
    if (positionId) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Analysis focused on position: ${positionId}`,
      );
    }
    if (documentIds && documentIds.length > 0) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Analysis focused on ${documentIds.length} specific document(s)`,
      );
    }
    if (customPrompt) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Custom prompt provided (${customPrompt.length} characters)`,
      );
    }

    // Fetch candidate with all applications & positions
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Fetching candidate record with applications...`,
    );
    const candidateRecord = await getCandidateWithApplications(candidateId);

    if (!candidateRecord) {
      console.error(
        `[POST /api/candidate/:id/ai-analysis] Candidate not found - ID: ${candidateId}`,
      );
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 },
      );
    }

    console.log(
      `[POST /api/candidate/:id/ai-analysis] Candidate found - Name: ${candidateRecord.firstName} ${candidateRecord.lastName}, Applications: ${candidateRecord.applications.length}`,
    );

    // Choose the relevant application for analysis
    const targetApplication =
      (positionId &&
        candidateRecord.applications.find(
          (app) => app.position.id === positionId,
        )) ||
      candidateRecord.applications[0] ||
      null;

    const targetPosition = targetApplication?.position ?? null;

    if (targetApplication) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Using application ${targetApplication.id} for position: ${targetPosition?.name}`,
      );
    } else {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] No application found, proceeding with general candidate analysis`,
      );
    }

    // Build minimal structured context for the model
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Building structured context for AI model...`,
    );
    const structuredContext = {
      candidate: {
        name: `${candidateRecord.firstName} ${candidateRecord.lastName}`,
        email: candidateRecord.email,
        location: candidateRecord.location,
      },
      position: targetPosition
        ? {
            name: targetPosition.name,
            description: targetPosition.description,
          }
        : null,
    };

    // Fetch selected documents if documentIds are provided
    let selectedDocuments: Array<{
      id: string;
      name: string;
      fileSearchDocumentName: string | null;
    }> = [];
    if (documentIds && documentIds.length > 0) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Fetching ${documentIds.length} selected document(s)...`,
      );
      const allDocuments = await getDocumentsByCandidateId(candidateId);
      selectedDocuments = allDocuments
        .filter((doc) => documentIds.includes(doc.id))
        .map((doc) => ({
          id: doc.id,
          name: doc.name,
          fileSearchDocumentName: doc.fileSearchDocumentName,
        }));

      console.log(
        `[POST /api/candidate/:id/ai-analysis] Found ${selectedDocuments.length} document(s) with fileSearchDocumentName`,
      );
    }

    // Build document selection instruction
    let documentInstruction = "";
    if (selectedDocuments.length > 0) {
      const documentsWithFileSearch = selectedDocuments.filter(
        (doc) => doc.fileSearchDocumentName,
      );
      if (documentsWithFileSearch.length > 0) {
        documentInstruction = `Focus on these documents: ${documentsWithFileSearch.map((d) => d.name).join(", ")}`;
      }
    } else {
      documentInstruction = `Search all candidate documents.`;
    }

    // Build custom prompt section
    let customPromptSection = "";
    if (customPrompt && customPrompt.trim()) {
      customPromptSection = `\n\nUser requirements: ${customPrompt.trim()}`;
    }

    // Step 1: Get raw analysis from AI
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Step 1: Calling Gemini API for raw analysis...`,
    );
    const rawAnalysisPrompt =
      `Evaluate candidate fit for Dark Alpha Capital's position.

${documentInstruction.trim()}

Candidate: ${structuredContext.candidate.name} (${structuredContext.candidate.email})${structuredContext.candidate.location ? `, ${structuredContext.candidate.location}` : ""}
Position: ${structuredContext.position?.name || "General"}
${structuredContext.position?.description ? `\nJob Description: ${structuredContext.position.description}` : ""}
${customPromptSection}

Provide concise markdown analysis: background, skills, experience fit, culture fit, suitability. Use facts from documents. State if info is missing.`.trim();

    const rawAnalysisStartTime = Date.now();
    const fileSearchClient = createFileSearchClient();
    const rawAnalysisResponse = await generateContentWithFileSearch({
      client: fileSearchClient,
      model: "gemini-2.5-flash",
      prompt: rawAnalysisPrompt,
      fileSearchStoreNames: [CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME],
      metadataFilter: `candidate_id="${candidateId}"`,
    });
    const rawAnalysisDuration = Date.now() - rawAnalysisStartTime;
    const rawAnalysisText = rawAnalysisResponse.text || "";
    console.log("Raw analysis text:", rawAnalysisText);

    console.log(
      `[POST /api/candidate/:id/ai-analysis] Raw analysis received in ${rawAnalysisDuration}ms (${rawAnalysisText.length} characters)`,
    );

    // Step 2: Generate structured data from raw analysis
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Step 2: Generating structured data from raw analysis...`,
    );
    const structuredDataStartTime = Date.now();
    const { output: structuredData } = await generateText({
      model: googleAIClient("gemini-3-flash-preview"),
      output: Output.object({
        schema: candidateAiScreeningSchema,
      }),
      prompt: `Extract structured evaluation from this analysis:

${rawAnalysisText}

Provide: score (0-10), recommendation (Strong Hire/Hire/Neutral/Do Not Hire), markdown analysis, strengths (3-7), concerns (with severity), experience fit (score + assessment + relevant/gaps), skills fit (score + assessment + strong/developing), culture fit (score + assessment + indicators).`.trim(),
    });
    const structuredDataDuration = Date.now() - structuredDataStartTime;
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Structured data generated in ${structuredDataDuration}ms - Score: ${structuredData.score}, Recommendation: ${structuredData.recommendation}`,
    );

    // Save the complete structured data
    const candidateAiScreening = structuredData;

    // Save the analysis to the database
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Saving AI screening to database...`,
    );
    const savedScreening = await saveCandidateAiScreening({
      candidateId,
      positionId: targetApplication?.position.id || null,
      applicationId: targetApplication?.id || null,
      analysis: rawAnalysisText,
      model: "gemini-3-flash-preview",
      structuredData: candidateAiScreening,
    });

    if (!savedScreening) {
      console.warn(
        `[POST /api/candidate/:id/ai-analysis] Failed to save AI screening to database, but analysis was generated successfully`,
      );
    } else {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] AI screening saved to database - Screening ID: ${savedScreening.id}`,
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Request completed successfully in ${duration}ms - Candidate ID: ${candidateId}, Screening ID: ${savedScreening?.id || "none"}`,
    );
    return NextResponse.json(
      {
        analysis: rawAnalysisText,
        score: candidateAiScreening.score,
        screeningId: savedScreening?.id || null,
      },
      { status: 200 },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[POST /api/candidate/:id/ai-analysis] Error during candidate AI analysis after ${duration}ms:`,
      error,
    );
    return NextResponse.json(
      {
        error: "Failed to analyze candidate",
      },
      { status: 500 },
    );
  }
}
