import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import EmployeeEditForm from "#/features/employees/components/employee-edit-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";
import { Button } from "#/components/ui/button";
import BackButton from "#/components/shared/back-button";

// SAFETY: the employees route's validateSearch fills in defaults for all
// search params, so an empty search object is a valid navigation target;
// `never` only satisfies tanstack's required-search typing.
const emptyEmployeesSearch = {} as never;

export function EmployeeEditPage() {
  const { employee, positions } = useLoaderData({
    from: "/_main/employees/$id/edit",
  });

  return (
    <div className="block-space-mini narrow-container mx-auto">
      <BackButton />

      <div className="mt-4 md:mt-6 lg:mt-8">
        {!employee ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Employee not found.</p>
            <Button asChild className="mt-4">
              <Link to="/employees" search={emptyEmployeesSearch}>
                Back to Employees
              </Link>
            </Button>
          </div>
        ) : (
          <Suspense fallback={<FormLoadingFallback />}>
            <EmployeeEditForm employee={employee} positions={positions} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
