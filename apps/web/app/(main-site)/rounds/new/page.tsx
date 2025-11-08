import RoundUploadForm from "@/components/forms/round-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions } from "@workspace/db/queries";

const page = () => {
  return (
    <div className="block-space narrow-container mx-auto">
      <Button>
        <Link href="/rounds">Back to Rounds</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayRoundUploadForm />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayRoundUploadForm() {
  const positions = await getPositions();
  return <RoundUploadForm positions={positions} />;
}
