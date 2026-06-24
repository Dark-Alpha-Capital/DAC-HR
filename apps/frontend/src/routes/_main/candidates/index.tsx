import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import CandidateFilters from "~/components/candidate-filters";
import BulkUploadCandidatesDialog from "~/components/bulk-upload-candidates-dialog";
import CandidatesViewWrapper from "~/components/candidates-view-wrapper";
import { candidatesIndexQueryOptions } from "~/lib/query/options/candidates";
import { useCandidatesIndex } from "~/hooks/queries/use-candidates-index";
import {
  toCandidateSort,
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "~/lib/parse-search";

function parseCandidatesSearch(search: Record<string, unknown>) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    position: toStringArray(search.position as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    source: toStringArray(search.source as string | string[] | undefined),
    sort: toCandidateSort(search.sort),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
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
  const { data, isLoading, isFetching } = useCandidatesIndex(search);

  if (isLoading && !data) {
    return <ListPageSkeleton layout="cards" />;
  }

  if (!data) {
    return null;
  }

  const {
    positions,
    candidates,
    applications,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <div className="flex items-center gap-2">
          <BulkUploadCandidatesDialog
            positions={positions.map((p) => ({ id: p.id, name: p.name }))}
          />
          <Button asChild>
            <Link to="/candidates/new" search="{}">
              New Candidate
            </Link>
          </Button>
        </div>
      </div>

      <CandidateFilters positions={positions} isFetching={isFetching} />

      {candidates.length === 0 && applications.length === 0 ? (
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
          candidates={candidates}
          applications={applications}
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      )}
    </div>
  );
}
