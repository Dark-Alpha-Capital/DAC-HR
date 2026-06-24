import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import ApplicationContainer from "~/components/application-container";
import FilterCandidatePosition from "~/components/filter-candidate-position";
import FilterApplicationStatus from "~/components/filter-application-status";
import FilterCandidateName from "~/components/filter-candidate-name";
import FilterCandidateEmail from "~/components/filter-candidate-email";
import ClearApplicationFiltersButton from "~/components/clear-application-filters-button";
import ApplicationsPaginationControls from "~/components/applications-pagination-controls";
import { applicationsIndexQueryOptions } from "~/lib/query/options/applications";
import { useApplicationsIndex } from "~/hooks/queries/use-applications-index";
import { toOptionalString, toPageNumber, toStringArray } from "~/lib/parse-search";

function parseApplicationsSearch(search: Record<string, unknown>) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    position: toStringArray(search.position as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

export const Route = createFileRoute("/_main/applications/")({
  head: () => ({
    meta: [{ title: "Applications" }],
  }),
  validateSearch: parseApplicationsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseApplicationsSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(applicationsIndexQueryOptions(search));
  },
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const search = Route.useSearch();
  const { data, isLoading, isFetching } = useApplicationsIndex(search);

  if (isLoading && !data) {
    return (
      <ListPageSkeleton filterCount={5} layout="cards" showActions={false} />
    );
  }

  if (!data) {
    return null;
  }

  const {
    positions,
    applications,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>

      <div
        className="flex flex-wrap items-center gap-2 transition-opacity"
        style={{ opacity: isFetching ? 0.7 : 1 }}
      >
        <FilterCandidateName />
        <FilterCandidateEmail />
        <FilterCandidatePosition positions={positions} />
        <FilterApplicationStatus />
        <ClearApplicationFiltersButton />
      </div>

      {applications.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-1">No applications found.</p>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Try adjusting or clearing the filters to see more applications."
              : "Applications will appear here when candidates apply for positions."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ApplicationContainer
            applications={applications}
            currentPage={currentPage}
            limit={50}
          />
          {totalPages > 1 ? (
            <ApplicationsPaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
