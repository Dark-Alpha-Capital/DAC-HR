import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { CandidateDocumentEditPage } from "#/features/candidates/components/candidate-document-edit-page";
import { loadCandidateDocumentEdit } from "#/features/candidates/server/queries/candidates";

export const Route = createFileRoute(
  "/_main/candidates/$uid/documents/$documentId/edit",
)({
  head: () => ({
    meta: [{ title: "Edit Document" }],
  }),
  loader: async ({ params }) =>
    loadCandidateDocumentEdit({
      data: { uid: params.uid, documentId: params.documentId },
    }),
  component: CandidateDocumentEditPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={4} />,
});
