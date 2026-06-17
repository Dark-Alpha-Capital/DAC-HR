import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { getPositions } from "@workspace/db/queries";
import FilterPositionHireLevel from "~/components/filter-position-hire-level";
import FilterPositionStatus from "~/components/filter-position-status";
import ClearPositionFiltersButton from "~/components/clear-position-filters-button";
import PositionContainer from "~/components/position-container";
import PaginationControls from "~/components/pagination-controls";
import { toPageNumber, toStringArray } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/positions/")({
  head: () => ({
    meta: [{ title: "Positions" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    hireLevel: toStringArray(search.hireLevel as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const { positions, total } = await getPositions(
      deps.hireLevel,
      deps.status,
      currentPage,
      limit,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      positions,
      currentPage,
      totalPages,
      hasNextPage: deps.page < totalPages,
      hasPreviousPage: deps.page > 1,
    };
  },
  component: PositionsPage,
});

function PositionsPage() {
  const { positions, currentPage, totalPages, hasNextPage, hasPreviousPage } =
    Route.useLoaderData();

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

      <div className="flex flex-wrap items-center gap-2">
        <FilterPositionHireLevel />
        <FilterPositionStatus />
        <ClearPositionFiltersButton />
      </div>

      {positions.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">No positions found.</p>
          <Button asChild className="mt-4">
            <Link to="/positions/new" search="{}">
              Create your first position
            </Link>
          </Button>
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
