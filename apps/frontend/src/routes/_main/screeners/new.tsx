import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { ScreenerNewPage } from "#/features/screeners/components/screener-new-page";
import { loadScreenerFormOptions } from "#/features/screeners/server/queries/screeners";

export const Route = createFileRoute("/_main/screeners/new")({
  head: () => ({
    meta: [{ title: "New Screener" }],
  }),
  loader: async () => loadScreenerFormOptions(),
  component: ScreenerNewPage,
  pendingComponent: () => <FormPageSkeleton />,
});
