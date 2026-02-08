"use server";

import { updateTag } from "next/cache";

export const resetCacheForCandidates = async () => {
  updateTag("candidates");
  updateTag("candidate-applications");
};

export const resetCacheForCandidateDocuments = async (candidateId: string) => {
  updateTag(`candidate-documents-${candidateId}`);
  updateTag(`candidate-applications-${candidateId}`);
};

export const resetCacheForCandidateAiScreenings = async (
  candidateId: string,
) => {
  updateTag(`candidate-ai-screenings-${candidateId}`);
  updateTag(`candidate-applications-${candidateId}`);
};
