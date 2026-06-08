import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import BackButton from "@/components/back-button";
import CandidateDocumentEditForm from "@/components/forms/candidate-document-edit-form";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";

export const Route = createFileRoute(
  "/_main/candidates/$uid/documents/$documentId/edit",
)({
  head: () => ({
    meta: [{ title: "Edit Document" }],
  }),
  loader: async ({ params }) => {
    const documents = await getDocumentsByCandidateId(params.uid);
    const document = documents.find((doc) => doc.id === params.documentId);
    return { document };
  },
  component: EditCandidateDocumentPage,
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
