import { queryOptions } from "@tanstack/react-query";
import {
  loadBundleAiAnalyses,
  loadInterviewBundleById,
  type InterviewBundleDetailData,
} from "~/lib/loaders/interviews";
import { loadScreenersIndex } from "~/lib/loaders/screeners";
import { queryKeys } from "~/lib/query/query-keys";

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
      return result as InterviewBundleDetailData | null;
    },
  });
}

export function interviewBundleScreeningsQueryOptions(bundleId: string) {
  return queryOptions({
    queryKey: queryKeys.interviews.bundleScreenings(bundleId),
    queryFn: async () => {
      const result = await loadBundleAiAnalyses({ data: bundleId });
      return result as Awaited<ReturnType<typeof loadBundleAiAnalyses>>;
    },
  });
}
