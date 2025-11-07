import PositionUploadForm from "@/components/forms/position-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

const page = () => {
  return (
    <div className="block-space narrow-container mx-auto">
      <Button>
        <Link href="/positions">Back to Positions</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <PositionUploadForm />
      </Suspense>
    </div>
  );
};

export default page;
