import RoundUploadForm from "@/components/forms/round-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions } from "@workspace/db/queries";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <Button>
        <Link href="/rounds">Back to Rounds</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayRoundUploadForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayRoundUploadForm({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { position } = await searchParams;
  const positions = await getPositions();
  const preSelectedPositionId = position
    ? Array.isArray(position)
      ? position[0]
      : position
    : "";
  return (
    <RoundUploadForm
      positions={positions}
      preSelectedPositionId={preSelectedPositionId || ""}
    />
  );
}
