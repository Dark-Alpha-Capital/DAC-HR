import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { Link, useSearch } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import FilterPositionSearch from "#/features/positions/components/filter-position-search";
import FilterPositionHireLevel from "#/features/positions/components/filter-position-hire-level";
import FilterPositionStatus from "#/features/positions/components/filter-position-status";
import ClearPositionFiltersButton from "#/features/positions/components/clear-position-filters-button";
import PositionContainer from "#/features/positions/components/position-container";
import PaginationControls from "#/components/shared/pagination-controls";
import {
  positionsIndexQueryOptions,
  type PositionsIndexData,
} from "#/features/positions/query-options";

export function PositionsListPage() {
  const search = useSearch({ from: "/_main/positions/" });
  const { data, isLoading, isFetching }: UseQueryResult<PositionsIndexData> =
    useQuery(positionsIndexQueryOptions(search));

  if (isLoading && !data) {
    return <ListPageSkeleton />;
  }

  if (!data) {
    return null;
  }

  const {
    positions,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>
        <Button asChild>
          <Link to="/positions/new" search={{}}>
            New Position
          </Link>
        </Button>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 transition-opacity"
        style={{ opacity: isFetching ? 0.7 : 1 }}
      >
        <FilterPositionSearch />
        <FilterPositionHireLevel />
        <FilterPositionStatus />
        <ClearPositionFiltersButton />
      </div>

      {positions.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No positions found matching your filters."
              : "No positions found."}
          </p>
          {hasFilters ? null : (
            <Button asChild className="mt-4">
              <Link to="/positions/new" search={{}}>
                Create your first position
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <PositionContainer positions={positions} />
          {totalPages > 1 ? (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              basePath="/positions"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
