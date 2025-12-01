import QuestionUploadForm from "@/components/forms/question-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { UserIsAdmin } from "@/components/auth-checks";

const page = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

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
