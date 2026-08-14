import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { RoundDetailPage } from "#/features/rounds/components/round-detail-page";
import { loadRoundById } from "#/features/rounds/server/queries/rounds";

export const Route = createFileRoute("/_main/rounds/$id/")({
  head: () => ({
    meta: [{ title: "Round Detail" }],
  }),
  loader: async ({ params }) => loadRoundById({ data: params.id }),
  component: RoundDetailPage,
  pendingComponent: () => (
    <DetailPageSkeleton container contentBlocks={3} showActions />
  ),
});
