import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
export const resetCacheForCandidates = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .handler(async () => {
});

export const resetCacheForCandidateDocuments = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: candidateId }) => {
});

export const resetCacheForCandidateAiScreenings = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string,) => data)
  .handler(async ({ data: candidateId }) => {
});
