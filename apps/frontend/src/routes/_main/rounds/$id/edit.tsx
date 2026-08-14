import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { RoundEditPage } from "#/features/rounds/components/round-edit-page";
import { loadRoundEdit } from "#/features/rounds/server/queries/rounds";

export const Route = createFileRoute("/_main/rounds/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Round" }],
  }),
  loader: async ({ params }) => loadRoundEdit({ data: params.id }),
  component: RoundEditPage,
  pendingComponent: () => <FormPageSkeleton />,
});
