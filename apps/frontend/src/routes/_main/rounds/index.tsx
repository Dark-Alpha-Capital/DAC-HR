import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { RoundsListPage } from "#/features/rounds/components/rounds-list-page";
import {
  parseRoundsSearch,
  roundsIndexQueryOptions,
} from "#/features/rounds/query-options";

export const Route = createFileRoute("/_main/rounds/")({
  head: () => ({
    meta: [{ title: "Rounds" }],
  }),
  validateSearch: parseRoundsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseRoundsSearch(location.search);
    await queryClient.ensureQueryData(roundsIndexQueryOptions(search));
  },
  pendingComponent: () => <ListPageSkeleton />,
  component: RoundsListPage,
});
