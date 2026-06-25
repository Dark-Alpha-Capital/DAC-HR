import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import EmployeeFilters from "~/components/employee-filters";
import EmployeeContainer from "~/components/employee-container";
import PaginationControls from "~/components/pagination-controls";
import { loadEmployeesIndex } from "~/lib/loaders/employees";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

function parseEmployeesSearch(search: Record<string, unknown>) {
  return {
    position: toStringArray(search.position as string | string[] | undefined),
    department: toStringArray(
      search.department as string | string[] | undefined,
    ),
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

type EmployeesIndexSearch = ReturnType<typeof parseEmployeesSearch>;

function employeesIndexQueryOptions(deps: EmployeesIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.employees.list(deps),
    queryFn: () => loadEmployeesIndex({ data: deps }),
  });
}

export const Route = createFileRoute("/_main/employees/")({
  head: () => ({
    meta: [{ title: "Employees" }],
  }),
  validateSearch: parseEmployeesSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseEmployeesSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(employeesIndexQueryOptions(search));
  },
  component: EmployeesPage,
});

function EmployeesPage() {
  const search = Route.useSearch();
  const { data, isLoading, isFetching } = useQuery({
    ...employeesIndexQueryOptions(search),
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) {
    return <ListPageSkeleton />;
  }

  if (!data) {
    return null;
  }

  const {
    positions,
    employees,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <Button asChild>
          <Link to="/employees/new" search="{}">
            New Employee
          </Link>
        </Button>
      </div>

      <div
        className="transition-opacity"
        style={{ opacity: isFetching ? 0.7 : 1 }}
      >
        <EmployeeFilters positions={positions} />
      </div>

      {employees.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No employees found matching the selected filters."
              : "No employees found."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/employees/new" search="{}">
              Add your first employee
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <EmployeeContainer employees={employees} />
          {totalPages > 1 ? (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              basePath="/employees"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
