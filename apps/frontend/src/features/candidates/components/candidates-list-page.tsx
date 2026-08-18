import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { Button } from "#/components/ui/button";
import CandidateFilters from "#/features/candidates/components/candidate-filters";
import BulkUploadCandidatesDialog from "#/features/candidates/components/bulk-upload-candidates-dialog";
import CandidatesViewWrapper from "#/features/candidates/components/candidates-view-wrapper";
import { candidatesIndexQueries } from "#/features/candidates/query-options";
import type { CandidatesIndexData } from "#/features/candidates/server/candidates-service";
import type { CandidateViewMode } from "#/features/candidates/helpers";

export function CandidatesListPage() {
  const search = useSearch({ from: "/_main/candidates/" });
  const navigate = useNavigate({ from: "/candidates/" });

  const { data, isLoading, isFetching }: UseQueryResult<CandidatesIndexData> =
    useQuery(candidatesIndexQueries.options(search));

  const setViewMode = (view: CandidateViewMode) => {
    void navigate({
      search: {
        ...search,
        view,
      },
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

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <div className="flex items-center gap-2">
          <BulkUploadCandidatesDialog positions={positions} />
          <Button asChild>
            <Link to="/candidates/new" search={{ position: undefined }}>
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
            <Link to="/candidates/new" search={{ position: undefined }}>
              Add your first candidate
            </Link>
          </Button>
        </div>
      ) : (
        <CandidatesViewWrapper
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          candidates={candidates}
          kanbanFilters={search}
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
