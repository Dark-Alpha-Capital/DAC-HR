import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { PositionsListPage } from "#/features/positions/components/positions-list-page";
import {
  parsePositionsSearch,
  positionsIndexQueryOptions,
} from "#/features/positions/query-options";

export const Route = createFileRoute("/_main/positions/")({
  head: () => ({
    meta: [{ title: "Positions" }],
  }),
  validateSearch: parsePositionsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parsePositionsSearch(location.search);
    await queryClient.query({
      ...positionsIndexQueryOptions(search),
      staleTime: "static",
    });
  },
  pendingComponent: () => <ListPageSkeleton />,
  component: PositionsListPage,
});
