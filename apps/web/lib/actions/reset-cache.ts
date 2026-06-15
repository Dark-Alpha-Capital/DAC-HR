import { createServerFn } from "@tanstack/react-start";
export const resetCacheForCandidates = createServerFn({ method: "POST" })
  .handler(async () => {
});

export const resetCacheForCandidateDocuments = createServerFn({ method: "POST" })
  .validator((data: string) => data)
  .handler(async ({ data: candidateId }) => {
});

export const resetCacheForCandidateAiScreenings = createServerFn({ method: "POST" })
  .validator((data: string,) => data)
  .handler(async ({ data: candidateId }) => {
});
