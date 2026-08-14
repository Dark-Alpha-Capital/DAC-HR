import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { ScreenerEditPage } from "#/features/screeners/components/screener-edit-page";
import {
  loadScreenerEdit,
  loadScreenerFormOptions,
} from "#/features/screeners/server/queries/screeners";

export const Route = createFileRoute("/_main/screeners/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Screener" }],
  }),
  loader: async ({ params }) => {
    const [screenerData, options] = await Promise.all([
      loadScreenerEdit({ data: params.id }),
      loadScreenerFormOptions(),
    ]);
    return { ...screenerData, ...options };
  },
  component: ScreenerEditPage,
  pendingComponent: () => <FormPageSkeleton />,
});
