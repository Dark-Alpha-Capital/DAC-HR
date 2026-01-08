import { NextRequest, NextResponse } from "next/server";
import {
  getInterviewById,
  getApplicationById,
  saveInterviewAiAnalysis,
  getInterviewAiAnalysesByInterviewId,
  deleteInterviewAiAnalysis,
} from "@workspace/db/queries";
import { googleAIClient } from "@/lib/ai/models";
import { requireAuth } from "@/lib/middleware/auth";
import { generateText, Output } from "ai";
import { interviewAiAnalysisSchema } from "@/lib/schemas/interview-ai-analysis-schema";

/**
 * Interview AI analysis endpoint
 *
 * - Fetches interview data (questions, feedback, ratings)
 * - Fetches position data for context
 * - Uses Gemini to analyze interview performance against position requirements
 * - Returns a structured analysis report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { id: interviewId } = await params;
    console.log(
      `[POST /api/interview/:id/ai-analysis] Starting AI analysis for interview ${interviewId} - User: ${user?.email || "unknown"}`
    );

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    let body: { customPrompt?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Ignore JSON parse errors
    }

    const { customPrompt } = body;
    if (customPrompt) {
      console.log(
        `[POST /api/interview/:id/ai-analysis] Custom prompt provided (${customPrompt.length} characters)`
      );
    }

    // Fetch interview with full details
    console.log(
      `[POST /api/interview/:id/ai-analysis] Fetching interview data...`
    );
    const interview = await getInterviewById(interviewId);

    if (!interview) {
      console.error(
        `[POST /api/interview/:id/ai-analysis] Interview not found - ID: ${interviewId}`
      );
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Fetch application with position details
    const application = await getApplicationById(interview.applicationId);
    if (!application) {
      console.error(
        `[POST /api/interview/:id/ai-analysis] Application not found for interview`
      );
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    console.log(
      `[POST /api/interview/:id/ai-analysis] Interview found - Round: ${interview.roundTemplate.name}, Position: ${application.position.name}`
    );

    // Build interview context for AI
    const interviewContext = {
      roundName: interview.roundTemplate.name,
      roundDescription: interview.roundTemplate.description,
      status: interview.status,
      rating: interview.rating,
      overallFeedback: interview.overallFeedback,
      interviewer: interview.interviewer?.name || interview.interviewer?.email,
      questions: interview.questions.map((q) => ({
        question: q.questionText,
        notes: q.feedback?.notes || null,
        rating: q.feedback?.rating || null,
      })),
    };

    const positionContext = {
      name: application.position.name,
      description: application.position.description,
    };

    // Build questions text for the prompt
    const questionsText = interviewContext.questions
      .map((q, i) => {
        const parts = [`${i + 1}. ${q.question}`];
        if (q.rating) parts.push(`Rating: ${q.rating}/5`);
        if (q.notes) parts.push(`Notes: ${q.notes}`);
        return parts.join(" | ");
      })
      .join("\n");

    // Generate AI analysis
    console.log(
      `[POST /api/interview/:id/ai-analysis] Calling Gemini API for structured analysis...`
    );
    const analysisStartTime = Date.now();

    const promptParts = [
      `Position: ${positionContext.name}${positionContext.description ? ` - ${positionContext.description}` : ""}`,
      `Round: ${interviewContext.roundName}${interviewContext.roundDescription ? ` - ${interviewContext.roundDescription}` : ""}`,
      `Rating: ${interviewContext.rating ? `${interviewContext.rating}/5` : "N/A"} | Status: ${interviewContext.status} | Interviewer: ${interviewContext.interviewer || "N/A"}`,
      interviewContext.overallFeedback
        ? `Overall: ${interviewContext.overallFeedback}`
        : null,
      questionsText || "No questions",
      customPrompt?.trim() ? `Additional: ${customPrompt.trim()}` : null,
      "Analyze: performance, alignment with role, strengths/concerns, per-question breakdown, hiring recommendation. Be objective; note missing info, don't speculate.",
    ].filter(Boolean);

    const prompt = promptParts.join("\n\n");

    const { output: structuredData } = await generateText({
      model: googleAIClient("gemini-2.5-flash"),
      output: Output.object({
        schema: interviewAiAnalysisSchema,
      }),
      prompt,
    });

    const analysisDuration = Date.now() - analysisStartTime;
    console.log(
      `[POST /api/interview/:id/ai-analysis] Analysis generated in ${analysisDuration}ms - Score: ${structuredData.score}, Recommendation: ${structuredData.recommendation}`
    );

    // Save the analysis to the database
    console.log(
      `[POST /api/interview/:id/ai-analysis] Saving analysis to database...`
    );
    const savedAnalysis = await saveInterviewAiAnalysis({
      interviewId,
      applicationId: application.id,
      positionId: application.position.id,
      analysis: structuredData.overallSummary,
      customPrompt: customPrompt || null,
      model: "gemini-2.5-flash",
      structuredData,
    });

    if (!savedAnalysis) {
      console.warn(
        `[POST /api/interview/:id/ai-analysis] Failed to save analysis to database`
      );
    } else {
      console.log(
        `[POST /api/interview/:id/ai-analysis] Analysis saved - ID: ${savedAnalysis.id}`
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[POST /api/interview/:id/ai-analysis] Request completed in ${duration}ms`
    );

    return NextResponse.json(
      {
        analysis: structuredData,
        analysisId: savedAnalysis?.id || null,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[POST /api/interview/:id/ai-analysis] Error after ${duration}ms:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to analyze interview" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch all analyses for an interview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id: interviewId } = await params;

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    const analyses = await getInterviewAiAnalysesByInterviewId(interviewId);

    return NextResponse.json({ analyses }, { status: 200 });
  } catch (error) {
    console.error(`[GET /api/interview/:id/ai-analysis] Error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to delete an analysis
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("analysisId");

    if (!analysisId) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      );
    }

    const deleted = await deleteInterviewAiAnalysis(analysisId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`[DELETE /api/interview/:id/ai-analysis] Error:`, error);
    return NextResponse.json(
      { error: "Failed to delete analysis" },
        { status: 500 }
    );
  }
}
