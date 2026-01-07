import { NextRequest, NextResponse } from "next/server";
import {
  getCandidateWithApplications,
  getDocumentsByCandidateId,
  saveCandidateAiScreening,
} from "@workspace/db/queries";
import {
  CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME,
  googleGenAI,
} from "@/lib/ai/models";
import { requireAuth } from "@/lib/middleware/auth";

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
  { params }: { params: Promise<{ id: string }> }
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
      `[POST /api/candidate/:id/ai-analysis] Starting AI analysis for candidate ${candidateId} - User: ${user?.email || "unknown"} (${user?.id || "unknown"})`
    );

    if (!candidateId) {
      console.error("[POST /api/candidate/:id/ai-analysis] Missing candidate ID");
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
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
        "[POST /api/candidate/:id/ai-analysis] No request body provided, proceeding without positionId"
      );
    }

    const { positionId, documentIds, customPrompt } = body;
    if (positionId) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Analysis focused on position: ${positionId}`
      );
    }
    if (documentIds && documentIds.length > 0) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Analysis focused on ${documentIds.length} specific document(s)`
      );
    }
    if (customPrompt) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Custom prompt provided (${customPrompt.length} characters)`
      );
    }

    // Fetch candidate with all applications & positions
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Fetching candidate record with applications...`
    );
    const candidateRecord = await getCandidateWithApplications(candidateId);

    if (!candidateRecord) {
      console.error(
        `[POST /api/candidate/:id/ai-analysis] Candidate not found - ID: ${candidateId}`
      );
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    console.log(
      `[POST /api/candidate/:id/ai-analysis] Candidate found - Name: ${candidateRecord.firstName} ${candidateRecord.lastName}, Applications: ${candidateRecord.applications.length}`
    );

    // Choose the relevant application for analysis
    const targetApplication =
      (positionId &&
        candidateRecord.applications.find(
          (app) => app.position.id === positionId
        )) ||
      candidateRecord.applications[0] ||
      null;

    const targetPosition = targetApplication?.position ?? null;

    if (targetApplication) {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] Using application ${targetApplication.id} for position: ${targetPosition?.name}`
      );
    } else {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] No application found, proceeding with general candidate analysis`
      );
    }

    // Build a compact structured context for the model
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Building structured context for AI model...`
    );
    const structuredContext = {
      candidate: {
        id: candidateRecord.id,
        firstName: candidateRecord.firstName,
        lastName: candidateRecord.lastName,
        email: candidateRecord.email,
        phone: candidateRecord.phone,
        location: candidateRecord.location,
        source: candidateRecord.source,
        sourceUrl: candidateRecord.sourceUrl,
        note: candidateRecord.note,
        createdAt: candidateRecord.createdAt,
        updatedAt: candidateRecord.updatedAt,
      },
      focusApplication: targetApplication
        ? {
            id: targetApplication.id,
            status: targetApplication.status,
            personality: targetApplication.personality,
            createdAt: targetApplication.createdAt,
            updatedAt: targetApplication.updatedAt,
            position: {
              id: targetApplication.position.id,
              name: targetApplication.position.name,
              slug: targetApplication.position.slug,
              description: targetApplication.position.description,
            },
            interviews: (targetApplication.interviews || []).map((iv) => ({
              id: iv.id,
              status: iv.status,
              rating: iv.rating,
              scheduledAt: iv.scheduledAt,
              overallFeedback: iv.overallFeedback,
              roundTemplate: {
                id: iv.roundTemplate.id,
                name: iv.roundTemplate.name,
                description: iv.roundTemplate.description,
              },
            })),
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
        `[POST /api/candidate/:id/ai-analysis] Fetching ${documentIds.length} selected document(s)...`
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
        `[POST /api/candidate/:id/ai-analysis] Found ${selectedDocuments.length} document(s) with fileSearchDocumentName`
      );
    }

    const structuredContextJson = JSON.stringify(structuredContext, null, 2);

    // Simplified prompt for candidate suitability analysis
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Generating AI analysis prompt...`
    );

    // Build document selection instruction
    let documentInstruction = "";
    if (selectedDocuments.length > 0) {
      const documentsWithFileSearch = selectedDocuments.filter(
        (doc) => doc.fileSearchDocumentName
      );
      if (documentsWithFileSearch.length > 0) {
        documentInstruction = `
IMPORTANT: Focus your analysis on the following specific documents from the file search store:
${documentsWithFileSearch
  .map(
    (doc) =>
      `- ${doc.name} (fileSearchDocumentName: ${doc.fileSearchDocumentName})`
  )
  .join("\n")}

When using the fileSearch tool, prioritize these documents, but you may also reference other documents if relevant.
`;
      } else {
        documentInstruction = `
NOTE: Specific documents were selected, but they may not be available in the file search store yet.
Please analyze all available documents for this candidate.
`;
      }
    } else {
      documentInstruction = `
Use the fileSearch tool to retrieve and read **all** documents for this candidate
from the \`${CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME}\` store. These may include resume,
cover letter, case studies, work samples, interview feedback, and internal notes.
`;
    }

    // Build custom prompt section
    let customPromptSection = "";
    if (customPrompt && customPrompt.trim()) {
      customPromptSection = `

ADDITIONAL USER REQUIREMENTS:
The user has provided specific questions or requirements for this analysis:
${customPrompt.trim()}

Please ensure your analysis addresses these specific requirements while maintaining the overall evaluation framework.
`;
    }

    const prompt = `
You are an expert buy-side hedge fund recruiter and people manager for DarkAlpha Capital.
Your task is to evaluate whether the candidate is a strong fit for the specific position,
using BOTH:
- the structured candidate + position data I give you, AND
- the candidate's documents available via the file search tool.

FIRST, ${documentInstruction.trim()}

Then, based on everything you know, produce a comprehensive markdown analysis report
covering the candidate's background, skills, experience fit, culture fit, and overall
suitability for the role.

Important guidelines:
- Always ground your reasoning in specific facts from the candidate data and documents.
- If some information is missing, **explicitly say what is missing** instead of guessing.
- Be concise but concrete; avoid generic HR language.

Here is the structured data about the candidate and position (JSON):
\`\`\`json
${structuredContextJson}
\`\`\`
${customPromptSection}

Now perform the full analysis as described above.
    `.trim();

    // Simplified prompt - just ask for score and analysis
    const enhancedPrompt = `${prompt}

Please provide your analysis in the following format:

**Score:** [A number from 0-10 indicating candidate suitability]

**Analysis:**
[Your complete markdown analysis report covering candidate background, skills, experience fit, culture fit, and overall suitability]

You can provide the analysis in any format you prefer, but please include a clear score (0-10) and a comprehensive analysis.`;

    console.log(
      `[POST /api/candidate/:id/ai-analysis] Calling Gemini API for analysis...`
    );
    const aiStartTime = Date.now();
    const response = await googleGenAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: enhancedPrompt }],
        },
      ],
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [CANDIDATE_DOCUMENTS_SEARCH_STORE_NAME],
              metadataFilter: `candidate_id="${candidateId}"`,
            },
          },
        ],
      },
    });
    const aiDuration = Date.now() - aiStartTime;
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Gemini API response received in ${aiDuration}ms`
    );

    // Extract score and analysis from response (flexible parsing)
    console.log(`[POST /api/candidate/:id/ai-analysis] Parsing AI response...`);
    let responseText: string = response.text || "";

    // Try to extract score from the response (look for patterns like "Score: 7" or "Score: 7.5" or "**Score:** 8")
    let score = 5; // Default score if not found
    const scorePatterns = [
      /\*\*Score:\*\*\s*(\d+(?:\.\d+)?)/i,
      /Score:\s*(\d+(?:\.\d+)?)/i,
      /"score":\s*(\d+(?:\.\d+)?)/i,
      /score["\s:]*(\d+(?:\.\d+)?)/i,
    ];

    for (const pattern of scorePatterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        const extractedScore = parseFloat(match[1]);
        if (
          !isNaN(extractedScore) &&
          extractedScore >= 0 &&
          extractedScore <= 10
        ) {
          score = Math.round(extractedScore * 10) / 10; // Round to 1 decimal place
          console.log(
            `[POST /api/candidate/:id/ai-analysis] Extracted score: ${score}`
          );
          break;
        }
      }
    }

    // Extract analysis - use the full response text, or try to find it after "Analysis:" marker
    let analysis = responseText.trim();
    const analysisMarkers = [
      /\*\*Analysis:\*\*\s*([\s\S]*)/i,
      /Analysis:\s*([\s\S]*)/i,
      /"analysis":\s*"([\s\S]*)"/i,
    ];

    for (const pattern of analysisMarkers) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        analysis = match[1].trim();
        break;
      }
    }

    // Clean up the analysis text
    analysis = analysis
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^\*\*Score:\*\*\s*\d+(?:\.\d+)?\s*/i, "")
      .replace(/^Score:\s*\d+(?:\.\d+)?\s*/i, "")
      .trim();

    // If analysis is empty, use the full response
    if (!analysis || analysis.length < 50) {
      analysis = responseText.trim();
    }

    const candidateAiScreening = {
      score,
      analysis,
    };

    console.log(
      `[POST /api/candidate/:id/ai-analysis] AI analysis parsed successfully - Score: ${candidateAiScreening.score}, Analysis length: ${candidateAiScreening.analysis.length} characters`
    );

    // Save the analysis to the database
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Saving AI screening to database...`
    );
    const savedScreening = await saveCandidateAiScreening({
      candidateId,
      positionId: targetApplication?.position.id || null,
      applicationId: targetApplication?.id || null,
      analysis: candidateAiScreening.analysis,
      model: "gemini-2.5-flash",
      structuredData: {
        score: candidateAiScreening.score,
        analysis: candidateAiScreening.analysis,
      },
    });

    if (!savedScreening) {
      console.warn(
        `[POST /api/candidate/:id/ai-analysis] Failed to save AI screening to database, but analysis was generated successfully`
      );
    } else {
      console.log(
        `[POST /api/candidate/:id/ai-analysis] AI screening saved to database - Screening ID: ${savedScreening.id}`
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[POST /api/candidate/:id/ai-analysis] Request completed successfully in ${duration}ms - Candidate ID: ${candidateId}, Screening ID: ${savedScreening?.id || "none"}`
    );
    return NextResponse.json(
      {
        analysis: candidateAiScreening.analysis,
        score: candidateAiScreening.score,
        screeningId: savedScreening?.id || null,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[POST /api/candidate/:id/ai-analysis] Error during candidate AI analysis after ${duration}ms:`,
      error
    );
    return NextResponse.json(
      {
        error: "Failed to analyze candidate",
      },
      { status: 500 }
    );
  }
}

