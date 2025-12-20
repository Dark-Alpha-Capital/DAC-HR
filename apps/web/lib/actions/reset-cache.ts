"use server";

import { updateTag } from "next/cache";

export const resetCacheForCandidates = async () => {
  updateTag("candidates");
};

export const resetCacheForCandidateDocuments = async (candidateId: string) => {
  updateTag(`candidate-documents-${candidateId}`);
};

export const resetCacheForCandidateAiScreenings = async (
  candidateId: string
) => {
  updateTag(`candidate-ai-screenings-${candidateId}`);
};
