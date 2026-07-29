import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import FilterPositionSearch from "~/components/filter-position-search";
import FilterPositionHireLevel from "~/components/filter-position-hire-level";
import FilterPositionStatus from "~/components/filter-position-status";
import ClearPositionFiltersButton from "~/components/clear-position-filters-button";
import PositionContainer from "~/components/position-container";
import PaginationControls from "~/components/pagination-controls";
import { loadPositionsIndex } from "~/lib/loaders/positions";
import { toPageNumber, toStringArray } from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

function parsePositionsSearch(search: Record<string, unknown>) {
  return {
    search: typeof search.search === "string" ? search.search : "",
    hireLevel: toStringArray(search.hireLevel as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

type PositionsIndexSearch = ReturnType<typeof parsePositionsSearch>;
type PositionsIndexData = Awaited<ReturnType<typeof loadPositionsIndex>>;

function positionsIndexQueryOptions(deps: PositionsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.positions.list(deps),
    queryFn: async (): Promise<PositionsIndexData> =>
      loadPositionsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}

export const Route = createFileRoute("/_main/positions/")({
  head: () => ({
    meta: [{ title: "Positions" }],
  }),
  validateSearch: parsePositionsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parsePositionsSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(positionsIndexQueryOptions(search));
  },
  component: PositionsPage,
});

function PositionsPage() {
  const search = Route.useSearch();
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
          <Link to="/positions/new" search="{}">
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
              <Link to="/positions/new" search="{}">
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
