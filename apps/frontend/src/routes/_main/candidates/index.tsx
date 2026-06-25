import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import CandidateFilters from "~/components/candidate-filters";
import BulkUploadCandidatesDialog from "~/components/bulk-upload-candidates-dialog";
import CandidatesViewWrapper from "~/components/candidates-view-wrapper";
import { loadCandidatesIndex } from "~/lib/loaders/candidates";
import {
  toCandidateSort,
  toCandidateView,
  type CandidateViewMode,
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

function parseCandidatesSearch(search: Record<string, unknown>) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    position: toStringArray(search.position as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    source: toStringArray(search.source as string | string[] | undefined),
    sort: toCandidateSort(search.sort),
    view: toCandidateView(search.view),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

type CandidatesIndexSearch = ReturnType<typeof parseCandidatesSearch>;

function candidatesIndexQueryOptions(deps: CandidatesIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.candidates.list(deps),
    queryFn: () => loadCandidatesIndex({ data: deps }),
  });
}

export const Route = createFileRoute("/_main/candidates/")({
  head: () => ({
    meta: [{ title: "Candidates" }],
  }),
  validateSearch: parseCandidatesSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseCandidatesSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(candidatesIndexQueryOptions(search));
  },
  component: CandidatesPage,
});

function CandidatesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isLoading, isFetching } = useQuery({
    ...candidatesIndexQueryOptions(search),
    placeholderData: keepPreviousData,
  });

  const setViewMode = (view: CandidateViewMode) => {
    void navigate({
      search: (current) => ({
        ...current,
        view,
      }),
    });
  };

  if (isLoading && !data) {
    return <ListPageSkeleton layout="cards" />;
  }

  if (!data) {
    return null;
  }

  const {
    positions,
    candidates,
    currentPage,
    limit,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  const viewMode = search.view ?? "kanban";

  const kanbanFilters = {
    name: search.name,
    email: search.email,
    position: search.position,
    status: search.status,
    source: search.source,
    sort: search.sort,
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <div className="flex items-center gap-2">
          <BulkUploadCandidatesDialog
            positions={positions.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
            }))}
          />
          <Button asChild>
            <Link to="/candidates/new" search="{}">
              New Candidate
            </Link>
          </Button>
        </div>
      </div>

      <CandidateFilters positions={positions} isFetching={isFetching} />

      {totalCount === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No candidates found matching the selected filters."
              : "No candidates found."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/candidates/new" search="{}">
              Add your first candidate
            </Link>
          </Button>
        </div>
      ) : (
        <CandidatesViewWrapper
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          candidates={candidates}
          kanbanFilters={kanbanFilters}
          currentPage={currentPage}
          limit={limit}
          totalCount={totalCount}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      )}
    </div>
  );
}
