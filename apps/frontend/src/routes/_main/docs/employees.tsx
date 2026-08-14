import { createFileRoute } from "@tanstack/react-router";
import { EmployeesDocsPage as EmployeesPage } from "#/features/docs/components/employees-page";

export const Route = createFileRoute("/_main/docs/employees")({
  head: () => ({
    meta: [{ title: "Employees - DAC HR" }],
  }),
  component: EmployeesPage,
});
