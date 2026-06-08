import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import EmployeeEditForm from "@/components/forms/employee-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import { getEmployeeById, getPositions } from "@workspace/db/queries";
import BackButton from "@/components/back-button";

export const Route = createFileRoute("/_main/employees/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Employee" }],
  }),
  loader: async ({ params }) => {
    const [employee, { positions }] = await Promise.all([
      getEmployeeById(params.id),
      getPositions(),
    ]);

    return {
      employee,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
    };
  },
  component: EditEmployeePage,
});

function EditEmployeePage() {
  const { employee, positions } = Route.useLoaderData();

  return (
    <div className="block-space-mini narrow-container mx-auto">
      <BackButton />

      <div className="mt-4 md:mt-6 lg:mt-8">
        {!employee ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Employee not found.</p>
            <Button asChild className="mt-4">
              <Link to="/employees" search={{} as any}>Back to Employees</Link>
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
