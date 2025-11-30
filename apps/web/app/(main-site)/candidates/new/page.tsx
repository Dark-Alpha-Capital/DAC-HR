import CandidateUploadForm from "@/components/forms/candidate-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions } from "@workspace/db/queries";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="block-space-mini narrow-container mx-auto">
      <Button>
        <Link href="/candidates">Back to Candidates</Link>
      </Button>

      <div className="mt-4 md:mt-6 lg:mt-8">
        <Suspense fallback={<FormLoadingFallback />}>
          <DisplayCandidateUploadForm />
        </Suspense>
      </div>
    </div>
  );
};

export default page;

async function DisplayCandidateUploadForm() {
  const positions = await getPositions();
  const cleanedPositions = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));
  return <CandidateUploadForm positions={cleanedPositions} />;
}
