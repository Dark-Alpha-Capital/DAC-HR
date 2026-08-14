import {
  getApplicationById,
  saveInterviewAiAnalysis,
  getInterviewAiAnalysesByBundleId,
} from "@workspace/db/repositories/interview-repository";
import {
  getBundleById,
  getBundleRounds,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import {
  getScreenerById,
  getScreenerByPositionId,
} from "@workspace/db/repositories/screener-repository";
import { getAiModel } from "#/lib/ai/models";
import { generateText, Output } from "ai";
import { interviewAiAnalysisSchema } from "#/features/interviews/schemas";
import { buildBundleInterviewAnalysisPrompt } from "#/features/interviews/interview-analysis-prompt";

export type BundleAnalysisResult = {
  analysis?: unknown;
  analysisId?: string | null;
  screenerName?: string;
  error?: string;
};

export async function runBundleAiAnalysisWithScreener({
  bundleId,
  screenerId,
  customPrompt,
}: {
  bundleId: string;
  screenerId: string;
  customPrompt?: string | null;
}): Promise<BundleAnalysisResult> {
  const screener = await getScreenerById(screenerId);

  if (!screener) {
    return { error: "Screener not found" };
  }

  const bundle = await getBundleById(bundleId);
  if (!bundle) {
    return { error: "Bundle not found" };
  }

  const rounds = await getBundleRounds(bundleId);
  if (rounds.length === 0) {
    return { error: "Bundle has no rounds configured" };
  }

  const application = await getApplicationById(bundle.applicationId);
  if (!application) {
    return { error: "Application not found" };
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

  return {
    analysis: structuredData,
    analysisId: savedAnalysis?.id || null,
    screenerName: screener.name,
  };
}

export async function autoRunBundleAiAnalysis(
  bundleId: string,
): Promise<{ ran: boolean; reason?: string }> {
  try {
    const bundle = await getBundleById(bundleId);
    if (!bundle) {
      return { ran: false, reason: "bundle_not_found" };
    }

    const application = await getApplicationById(bundle.applicationId);
    if (!application) {
      return { ran: false, reason: "application_not_found" };
    }

    const screener = await getScreenerByPositionId(application.position.id);

    if (!screener) {
      return { ran: false, reason: "no_screener_for_position" };
    }

    const existing = await getInterviewAiAnalysesByBundleId(bundleId);
    if (existing.some((item) => item.screenerId === screener.id)) {
      return { ran: false, reason: "already_analysed" };
    }

    const result = await runBundleAiAnalysisWithScreener({
      bundleId,
      screenerId: screener.id,
    });

    if (result.error) {
      console.error("Auto AI analysis error:", result.error);
      return { ran: false, reason: result.error };
    }

    return { ran: true };
  } catch (error) {
    console.error(
      "Auto AI analysis failed:",
      error instanceof Error ? error.message : error,
    );
    return { ran: false, reason: "error" };
  }
}
