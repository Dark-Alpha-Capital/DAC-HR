import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import {
  interviewBundleDetailQueryOptions,
  interviewBundleScreeningsQueryOptions,
  screenersListQueryOptions,
} from "#/features/interviews/interview-queries";
import { InterviewBundleDetailPage } from "#/features/interviews/components/interview-bundle-detail-page";

export const Route = createFileRoute("/_main/interviews/bundle/$bundleId/")({
  head: () => ({
    meta: [{ title: "Position Interview" }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    const detail = await queryClient.ensureQueryData(
      interviewBundleDetailQueryOptions(params.bundleId),
    );
    await Promise.all([
      queryClient.ensureQueryData(screenersListQueryOptions()),
      queryClient.ensureQueryData(
        interviewBundleScreeningsQueryOptions(params.bundleId),
      ),
    ]);
    return detail ?? null;
  },
  component: InterviewBundleDetailPage,
  pendingComponent: () => (
    <DetailPageSkeleton container tabs showBreadcrumb showActions />
  ),
});
