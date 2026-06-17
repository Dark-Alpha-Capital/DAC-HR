import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { getApplicationsFiltered, getPositions } from "@workspace/db/queries";
import ApplicationContainer from "~/components/application-container";
import FilterCandidatePosition from "~/components/filter-candidate-position";
import FilterApplicationStatus from "~/components/filter-application-status";
import FilterCandidateName from "~/components/filter-candidate-name";
import FilterCandidateEmail from "~/components/filter-candidate-email";
import ClearApplicationFiltersButton from "~/components/clear-application-filters-button";
import ApplicationsPaginationControls from "~/components/applications-pagination-controls";
import { toOptionalString, toPageNumber, toStringArray } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/applications/")({
  head: () => ({
    meta: [{ title: "Applications" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    position: toStringArray(search.position as string | string[] | undefined),
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

    const [{ positions }, applicationsResult] = await Promise.all([
      getPositions(),
      getApplicationsFiltered(
        deps.name,
        deps.email,
        deps.position,
        deps.status,
        currentPage,
        limit,
      ),
    ]);

    const { applications, total } = applicationsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      applications,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.name || deps.email || deps.position?.length || deps.status?.length,
      ),
    };
  },
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const {
    positions,
    applications,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>

      <div className="flex flex-wrap items-center gap-2">
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
