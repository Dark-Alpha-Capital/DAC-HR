import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { EmployeeNewPage } from "#/features/employees/components/employee-new-page";
import { loadEmployeeNew } from "#/features/employees/server/queries/employees";

export const Route = createFileRoute("/_main/employees/new")({
  head: () => ({
    meta: [{ title: "New Employee" }],
  }),
  loader: async ({ location }) => {
    const query = location.href.includes("?")
      ? location.href.split("?")[1]?.split("#")[0] ?? ""
      : "";
    const params = new URLSearchParams(query);
    const candidateId = params.get("candidateId") ?? undefined;
    const applicationId = params.get("applicationId") ?? undefined;

    return loadEmployeeNew({ data: { candidateId, applicationId } });
  },
  component: EmployeeNewPage,
  pendingComponent: () => <FormPageSkeleton />,
});
