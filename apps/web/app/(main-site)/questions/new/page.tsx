import QuestionUploadForm from "@/components/forms/question-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions } from "@workspace/db/queries";
import { UserIsAdmin } from "@/components/auth-checks";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <Button>
        <Link href="/questions">Back to Questions</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayQuestionUploadForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayQuestionUploadForm({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { position, round } = await searchParams;
  const positions = await getPositions();

  const preSelectedPositionId = position
    ? Array.isArray(position)
      ? position[0]
      : position
    : "";

  const preSelectedRoundId = round
    ? Array.isArray(round)
      ? round[0]
      : round
    : "";

  return (
    <QuestionUploadForm
      positions={positions}
      preSelectedPositionId={preSelectedPositionId || ""}
      preSelectedRoundId={preSelectedRoundId || ""}
    />
  );
}
