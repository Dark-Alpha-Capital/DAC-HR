import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { EmployeeDetailPage } from "#/features/employees/components/employee-detail-page";
import { employeeDetailQueryOptions } from "#/features/employees/query-options";

export const Route = createFileRoute("/_main/employees/$id/")({
  head: () => ({
    meta: [{ title: "Employee Detail" }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(employeeDetailQueryOptions(params.id));
  },
  pendingComponent: () => <DetailPageSkeleton container tabs showBreadcrumb />,
  component: EmployeeDetailPage,
});
