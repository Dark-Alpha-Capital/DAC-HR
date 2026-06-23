import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import BackButton from "~/components/back-button";
import CandidateDocumentEditForm from "~/components/forms/candidate-document-edit-form";
import { loadCandidateDocumentEdit } from "~/lib/loaders/candidates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { FormLoadingFallback } from "~/components/skeletons/form-loading-skeleton";

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
  component: EditCandidateDocumentPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={4} />,
});

function EditCandidateDocumentPage() {
  const { document } = Route.useLoaderData();
  const { uid } = Route.useParams();

  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
      <Suspense fallback={<FormLoadingFallback />}>
        {!document ? (
          <Card>
            <CardHeader>
              <CardTitle>Document not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The document you&apos;re looking for doesn&apos;t exist or has
                been removed.
              </p>
            </CardContent>
            <CardContent>
              <Button asChild>
                <Link to="/candidates/$uid" search={{} as any} params={{ uid }}>
                  Back to Candidate
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CandidateDocumentEditForm />
        )}
      </Suspense>
    </div>
  );
}
