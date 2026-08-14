import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { EmployeeEditPage } from "#/features/employees/components/employee-edit-page";
import { loadEmployeeEdit } from "#/features/employees/server/queries/employees";

export const Route = createFileRoute("/_main/employees/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Employee" }],
  }),
  loader: async ({ params }) =>
    loadEmployeeEdit({ data: { id: params.id } }),
  component: EmployeeEditPage,
  pendingComponent: () => <FormPageSkeleton />,
});
