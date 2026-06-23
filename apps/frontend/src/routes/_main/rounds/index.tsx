import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { loadRoundsIndex } from "~/lib/loaders/rounds";
import RoundContainer from "~/components/round-container";
import FilterPositionType from "~/components/filter-position-type";
import ClearParamsButton from "~/components/clear-params-button";
import PaginationControls from "~/components/pagination-controls";
import { toPageNumber, toStringArray } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/rounds/")({
  head: () => ({
    meta: [{ title: "Rounds" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    type: toStringArray(search.type as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => loadRoundsIndex({ data: deps }),
  component: RoundsPage,
  pendingComponent: () => <ListPageSkeleton />,
});

function RoundsPage() {
  const {
    positions,
    rounds,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rounds</h1>
        <Button asChild>
          <Link to="/rounds/new" search="{}">New Round</Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
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
            <Link to="/rounds/new" search="{}">Create your first round</Link>
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
