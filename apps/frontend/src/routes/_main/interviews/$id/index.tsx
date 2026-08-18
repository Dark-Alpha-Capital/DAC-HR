import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { loadInterviewById } from "#/features/interviews/server/queries/interviews";
import { interviewScreeningsQueryOptions } from "#/features/interviews/interview-queries";
import { InterviewDetailPage } from "#/features/interviews/components/interview-detail-page";

export const Route = createFileRoute("/_main/interviews/$id/")({
  head: () => ({
    meta: [{ title: "Interview Detail" }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    const result = await loadInterviewById({ data: params.id });
    if (result?.interview) {
      await queryClient.ensureQueryData(
        interviewScreeningsQueryOptions(params.id),
      );
    }
    return result;
  },
  component: InterviewDetailPage,
  pendingComponent: () => (
    <DetailPageSkeleton container tabs showBreadcrumb showActions />
  ),
});
