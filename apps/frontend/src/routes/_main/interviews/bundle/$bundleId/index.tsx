import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import {
  interviewBundleDetailQueryOptions,
  interviewBundleEmailsQueryOptions,
  interviewBundleScreeningsQueryOptions,
  screenersListQueryOptions,
} from "#/features/interviews/interview-queries";
import { InterviewBundleDetailPage } from "#/features/interviews/components/interview-bundle-detail-page";
import { parseBundleDetailSearch } from "#/features/interviews/search";

export const Route = createFileRoute("/_main/interviews/bundle/$bundleId/")({
  head: () => ({
    meta: [{ title: "Position Interview" }],
  }),
  validateSearch: parseBundleDetailSearch,
  loader: async ({ context: { queryClient }, params }) => {
    const detail = await queryClient.query({
      ...interviewBundleDetailQueryOptions(params.bundleId),
      staleTime: "static",
    });
    await Promise.all([
      queryClient.query({
        ...screenersListQueryOptions(),
        staleTime: "static",
      }),
      queryClient.query({
        ...interviewBundleScreeningsQueryOptions(params.bundleId),
        staleTime: "static",
      }),
      queryClient.query({
        ...interviewBundleEmailsQueryOptions(params.bundleId),
        staleTime: "static",
      }),
    ]);
    return detail ?? null;
  },
  component: InterviewBundleDetailPage,
  pendingComponent: () => (
    <DetailPageSkeleton container tabs showBreadcrumb showActions />
  ),
});
