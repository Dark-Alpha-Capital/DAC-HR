import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import {
  loadInterviewById,
  type InterviewDetailData,
} from "#/features/interviews/server/queries/interviews";
import { InterviewDetailPage } from "#/features/interviews/components/interview-detail-page";

export const Route = createFileRoute("/_main/interviews/$id/")({
  head: () => ({
    meta: [{ title: "Interview Detail" }],
  }),
  loader: async ({ params }) => {
    const result = await loadInterviewById({ data: params.id });
    return result as InterviewDetailData;
  },
  component: InterviewDetailPage,
  pendingComponent: () => <DetailPageSkeleton container tabs showBreadcrumb showActions />,
});
