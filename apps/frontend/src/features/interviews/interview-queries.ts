import { queryOptions } from "@tanstack/react-query";
import {
  loadBundleAiAnalyses,
  loadInterviewBundleById,
} from "#/features/interviews/server/queries/interviews";
import type { InterviewBundleDetailData } from "#/features/interviews/types";
import { loadScreenersIndex } from "#/features/screeners/server/queries/screeners";
import { queryKeys } from "#/lib/query/query-keys";

export function screenersListQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.screeners.list(),
    queryFn: () => loadScreenersIndex(),
  });
}

export function interviewBundleDetailQueryOptions(bundleId: string) {
  return queryOptions({
    queryKey: queryKeys.interviews.bundleDetail(bundleId),
    queryFn: async () => {
      const result = await loadInterviewBundleById({ data: bundleId });
      // SAFETY: the loadInterviewBundleById server fn returns
      // interviewsService.getBundleById, which produces the
      // InterviewBundleDetailData shape (or null when the bundle is gone).
      return result as InterviewBundleDetailData | null;
    },
  });
}

export function interviewBundleScreeningsQueryOptions(bundleId: string) {
  return queryOptions({
    queryKey: queryKeys.interviews.bundleScreenings(bundleId),
    queryFn: async () => {
      const result = await loadBundleAiAnalyses({ data: bundleId });
      // SAFETY: the handler of loadBundleAiAnalyses returns the same type the
      // server fn declares; this restores the declared return type after the
      // client-side serialization wrapper is applied.
      return result as Awaited<ReturnType<typeof loadBundleAiAnalyses>>;
    },
  });
}
