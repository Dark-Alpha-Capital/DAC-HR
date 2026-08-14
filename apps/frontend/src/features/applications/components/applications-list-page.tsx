import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { useSearch } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import ApplicationContainer from "#/features/applications/components/application-container";
import FilterCandidatePosition from "#/components/shared/filter-candidate-position";
import FilterApplicationStatus from "#/components/shared/filter-application-status";
import FilterCandidateName from "#/components/shared/filter-candidate-name";
import FilterCandidateEmail from "#/components/shared/filter-candidate-email";
import ClearApplicationFiltersButton from "#/features/applications/components/clear-application-filters-button";
import ApplicationsPaginationControls from "#/features/applications/components/applications-pagination-controls";
import {
  applicationsIndexQueryOptions,
  type ApplicationsIndexData,
} from "#/features/applications/server/queries/applications";

export function ApplicationsListPage() {
  const search = useSearch({ from: "/_main/applications/" });
  const { data, isLoading, isFetching }: UseQueryResult<ApplicationsIndexData> =
    useQuery(applicationsIndexQueryOptions(search));

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
