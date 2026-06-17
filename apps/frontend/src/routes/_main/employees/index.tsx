import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { getEmployees, getPositions } from "@workspace/db/queries";
import EmployeeFilters from "~/components/employee-filters";
import EmployeeContainer from "~/components/employee-container";
import PaginationControls from "~/components/pagination-controls";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "~/lib/parse-search";

export const Route = createFileRoute("/_main/employees/")({
  head: () => ({
    meta: [{ title: "Employees" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
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
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, employeesResult] = await Promise.all([
      getPositions(),
      getEmployees(
        deps.position,
        deps.department,
        deps.name,
        deps.email,
        currentPage,
        limit,
      ),
    ]);

    const { employees, total } = employeesResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      employees,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.position?.length ||
        deps.department?.length ||
        deps.name ||
        deps.email,
      ),
    };
  },
  component: EmployeesPage,
});

function EmployeesPage() {
  const {
    positions,
    employees,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = Route.useLoaderData();

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

      <EmployeeFilters positions={positions} />

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
