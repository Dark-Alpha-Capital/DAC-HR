import {
  getApplicationById,
  saveInterviewAiAnalysis,
} from "@workspace/db/repositories/interview-repository";
import {
  getBundleById,
  getBundleRounds,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getInterviewById } from "@workspace/db/repositories/interview-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getScreenerById } from "@workspace/db/repositories/screener-repository";
import { getAiModel } from "#/lib/ai/models";
import { generateText, Output } from "ai";
import { interviewAiAnalysisSchema } from "#/features/interviews/schemas";
import {
  buildBundleInterviewAnalysisPrompt,
  buildInterviewAnalysisPrompt,
} from "#/features/interviews/interview-analysis-prompt";

export type AiAnalysisResult = {
  analysis?: unknown;
  analysisId?: string | null;
  screenerName?: string;
  error?: string;
};

/**
 * One server pipeline for both the single-interview and bundle AI analyses:
 * load screener + subject, build the prompt, generate structured text, and
 * persist the analysis. The two POST routes used to re-implement this inline.
 */
export async function runAiAnalysis({
  scope,
  screenerId,
  customPrompt,
}: {
  scope: { kind: "interview"; id: string } | { kind: "bundle"; id: string };
  screenerId: string;
  customPrompt?: string | null;
}): Promise<AiAnalysisResult> {
  const screener = await getScreenerById(screenerId);
  if (!screener) {
    return { error: "Screener not found" };
  }

  if (scope.kind === "interview") {
    const interview = await getInterviewById(scope.id);
    if (!interview) {
      return { error: "Interview not found" };
    }

    const application = await getApplicationById(interview.applicationId);
    if (!application) {
      return { error: "Application not found" };
    }

    const candidate = await getCandidateById(application.candidateId);
    const prompt = await buildInterviewAnalysisPrompt({
      screener,
      interview,
      application: {
        position: application.position,
        candidate: candidate
          ? { firstName: candidate.firstName, lastName: candidate.lastName }
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
      interviewId: scope.id,
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

  const bundle = await getBundleById(scope.id);
  if (!bundle) {
    return { error: "Bundle not found" };
  }

  const rounds = await getBundleRounds(scope.id);
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
    bundleId: scope.id,
    roundCount: rounds.length,
    application: {
      position: application.position,
      candidate: candidate
        ? { firstName: candidate.firstName, lastName: candidate.lastName }
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
    bundleId: scope.id,
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
