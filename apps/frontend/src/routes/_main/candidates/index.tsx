import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { CandidatesListPage } from "#/features/candidates/components/candidates-list-page";
import {
  parseCandidatesSearch,
  candidatesIndexQueries,
} from "#/features/candidates/query-options";

export const Route = createFileRoute("/_main/candidates/")({
  head: () => ({
    meta: [{ title: "Candidates" }],
  }),
  validateSearch: parseCandidatesSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseCandidatesSearch(location.search);
    await queryClient.ensureQueryData(candidatesIndexQueries.options(search));
  },
  pendingComponent: () => <ListPageSkeleton layout="cards" />,
  component: CandidatesListPage,
});
