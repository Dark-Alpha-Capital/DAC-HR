import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { Link, useSearch } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import RoundContainer from "#/features/rounds/components/round-container";
import FilterPositionType from "#/features/rounds/components/filter-position-type";
import ClearParamsButton from "#/features/rounds/components/clear-params-button";
import PaginationControls from "#/components/shared/pagination-controls";
import {
  roundsIndexQueryOptions,
  type RoundsIndexData,
} from "#/features/rounds/query-options";

export function RoundsListPage() {
  const search = useSearch({ from: "/_main/rounds/" });
  const { data, isLoading, isFetching }: UseQueryResult<RoundsIndexData> =
    useQuery(roundsIndexQueryOptions(search));

  if (isLoading && !data) {
    return <ListPageSkeleton />;
  }

  if (!data) {
    return null;
  }

  const {
    positions,
    rounds,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rounds</h1>
        <Button asChild>
          <Link to="/rounds/new" search={{ position: "" }}>
            New Round
          </Link>
        </Button>
      </div>

      <div
        className="flex items-center gap-2 transition-opacity"
        style={{ opacity: isFetching ? 0.7 : 1 }}
      >
        <FilterPositionType positionTypes={positions} />
        <ClearParamsButton />
      </div>

      {rounds.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No rounds found for the selected position(s)."
              : "No rounds found."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/rounds/new" search={{ position: "" }}>
              Create your first round
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <RoundContainer rounds={rounds} />
          {totalPages > 1 ? (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              basePath="/rounds"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
