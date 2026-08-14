import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { CandidateEditPage } from "#/features/candidates/components/candidate-edit-page";
import { loadCandidateEdit } from "#/features/candidates/server/queries/candidates";

export const Route = createFileRoute("/_main/candidates/$uid/edit")({
  head: () => ({
    meta: [{ title: "Edit Candidate" }],
  }),
  loader: async ({ params }) => loadCandidateEdit({ data: params.uid }),
  component: CandidateEditPage,
  pendingComponent: () => <FormPageSkeleton />,
});
