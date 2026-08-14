import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { PositionDetailPage } from "#/features/positions/components/position-detail-page";
import { loadPositionBySlug } from "#/features/positions/server/queries/positions";

export const Route = createFileRoute("/_main/positions/$slug/")({
  head: () => ({
    meta: [{ title: "Position Detail" }],
  }),
  loader: async ({ params }) => loadPositionBySlug({ data: params.slug }),
  component: PositionDetailPage,
  pendingComponent: () => <DetailPageSkeleton tabs tabCount={5} />,
});
