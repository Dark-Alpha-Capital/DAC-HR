import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { ApplicationDetailPage } from "#/features/applications/components/application-detail-page";
import { applicationDetailQueryOptions } from "#/features/applications/query-options";

export const Route = createFileRoute("/_main/applications/$id/")({
  head: () => ({
    meta: [{ title: "Application Detail" }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(applicationDetailQueryOptions(params.id));
  },
  pendingComponent: () => (
    <DetailPageSkeleton container tabs showBreadcrumb showActions />
  ),
  component: ApplicationDetailPage,
});
