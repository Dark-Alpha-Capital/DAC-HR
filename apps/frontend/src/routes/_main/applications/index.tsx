import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { ApplicationsListPage } from "#/features/applications/components/applications-list-page";
import {
  parseApplicationsSearch,
  applicationsIndexQueryOptions,
} from "#/features/applications/query-options";

export const Route = createFileRoute("/_main/applications/")({
  head: () => ({
    meta: [{ title: "Applications" }],
  }),
  validateSearch: parseApplicationsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseApplicationsSearch(location.search);
    await queryClient.ensureQueryData(applicationsIndexQueryOptions(search));
  },
  pendingComponent: () => (
    <ListPageSkeleton filterCount={5} layout="cards" showActions={false} />
  ),
  component: ApplicationsListPage,
});
