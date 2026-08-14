import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { PositionEditPage } from "#/features/positions/components/position-edit-page";
import { loadPositionEdit } from "#/features/positions/server/queries/positions";

export const Route = createFileRoute("/_main/positions/$slug/edit")({
  head: () => ({
    meta: [{ title: "Edit Position" }],
  }),
  loader: async ({ params }) => loadPositionEdit({ data: params.slug }),
  component: PositionEditPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={8} />,
});
