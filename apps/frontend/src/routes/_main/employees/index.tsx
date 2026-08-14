import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { EmployeesListPage } from "#/features/employees/components/employees-list-page";
import {
  parseEmployeesSearch,
  prismicMembersQueryOptions,
} from "#/features/docs/server/queries/members";

export const Route = createFileRoute("/_main/employees/")({
  head: () => ({
    meta: [{ title: "Employees" }],
  }),
  validateSearch: parseEmployeesSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseEmployeesSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(prismicMembersQueryOptions(search));
  },
  pendingComponent: () => <ListPageSkeleton />,
  component: EmployeesListPage,
});
