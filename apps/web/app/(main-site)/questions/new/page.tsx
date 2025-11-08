import QuestionUploadForm from "@/components/forms/question-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

const page = () => {
  return (
    <div className="block-space narrow-container mx-auto">
      <Button>
        <Link href="/questions">Back to Questions</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <QuestionUploadForm />
      </Suspense>
    </div>
  );
};

export default page;
