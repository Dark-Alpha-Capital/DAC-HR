import {
  getApplicationById,
  getInterviewAiAnalysesByBundleId,
} from "@workspace/db/repositories/interview-repository";
import { getBundleById } from "@workspace/db/repositories/interview-bundle-repository";
import { getScreenerByPositionId } from "@workspace/db/repositories/screener-repository";
import { runAiAnalysis, type AiAnalysisResult } from "./run-ai-analysis";

export type BundleAnalysisResult = AiAnalysisResult;

export async function runBundleAiAnalysisWithScreener({
  bundleId,
  screenerId,
  customPrompt,
}: {
  bundleId: string;
  screenerId: string;
  customPrompt?: string | null;
}): Promise<BundleAnalysisResult> {
  return runAiAnalysis({
    scope: { kind: "bundle", id: bundleId },
    screenerId,
    customPrompt,
  });
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
