import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import React, { Suspense } from "react";
import CandidateDocumentUploadForm from "@/components/forms/candidate-document-upload-form";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { UserAuthenticated } from "@/components/auth-checks";

type Params = Promise<{ uid: string }>;

const AddDocumentPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayAddDocumentForm params={params} />
      </Suspense>
    </div>
  );
};

export default AddDocumentPage;

const DisplayAddDocumentForm = async ({ params }: { params: Params }) => {
  const { uid } = await params;
  return (
    <div>
      <Button variant="outline" asChild>
        <Link href={`/candidates/${uid}`}>Back to Candidate</Link>
      </Button>

      <div className="mt-4 md:mt-6 lg:mt-8">
        <CandidateDocumentUploadForm candidateId={uid} />
      </div>
    </div>
  );
};
