import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import React, { Suspense } from "react";
import BackButton from "@/components/back-button";
import CandidateDocumentUploadForm from "@/components/forms/candidate-document-upload-form";

type Params = Promise<{ uid: string }>;

const AddDocumentPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
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
      <div>
        <CandidateDocumentUploadForm candidateId={uid} />
      </div>
    </div>
  );
};
