import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsDocsPage as ApplicationsPage } from "#/features/docs/components/applications-page";

export const Route = createFileRoute("/_main/docs/applications")({
  head: () => ({
    meta: [{ title: "Applications - DAC HR" }],
  }),
  component: ApplicationsPage,
});
