import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import CandidateDocumentUploadForm from "@/components/forms/candidate-document-upload-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";

export const Route = createFileRoute("/_main/candidates/$uid/add-document")({
  head: () => ({
    meta: [{ title: "Add Document" }],
  }),
  component: AddDocumentPage,
});

function AddDocumentPage() {
  const { uid } = Route.useParams();

  return (
    <div className="narrow-container mx-auto py-8 space-y-6">
      <Button variant="secondary" asChild>
        <Link to="/candidates/$uid" search={{} as any} params={{ uid }}>
          Back to Candidate
        </Link>
      </Button>

      <div className="mt-4 md:mt-6 lg:mt-8">
        <Suspense fallback={<FormLoadingFallback />}>
          <CandidateDocumentUploadForm candidateId={uid} />
        </Suspense>
      </div>
    </div>
  );
}
