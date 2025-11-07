import CandidateUploadForm from "@/components/forms/candidate-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions } from "@workspace/db/queries";

const page = () => {
  return (
    <div className="block-space narrow-container mx-auto">
      <Button>
        <Link href="/candidates">Back to Candidates</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayCandidateUploadForm />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayCandidateUploadForm() {
  const positions = await getPositions();
  return <CandidateUploadForm positions={positions} />;
}
