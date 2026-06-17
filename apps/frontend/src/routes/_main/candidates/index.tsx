import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import CandidateFilters from "~/components/candidate-filters";
import BulkUploadCandidatesDialog from "~/components/bulk-upload-candidates-dialog";
import CandidatesViewWrapper from "~/components/candidates-view-wrapper";
import { loadCandidatesIndex } from "~/lib/loaders/candidates";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "~/lib/parse-search";

export const Route = createFileRoute("/_main/candidates/")({
  head: () => ({
    meta: [{ title: "Candidates" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    position: toStringArray(search.position as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => loadCandidatesIndex({ data: deps }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const {
    positions,
    candidates,
    applications,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = Route.useLoaderData();

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <div className="flex items-center gap-2">
          <BulkUploadCandidatesDialog />
          <Button asChild>
            <Link to="/candidates/new" search="{}">
              New Candidate
            </Link>
          </Button>
        </div>
      </div>

      <CandidateFilters positions={positions} />

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
