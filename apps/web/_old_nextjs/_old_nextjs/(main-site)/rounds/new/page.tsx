import RoundUploadForm from "@/components/forms/round-upload-form";
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
  const positionsResult = await getPositions();
  const preSelectedPositionId = position
    ? Array.isArray(position)
      ? position[0]
      : position
    : "";
  const cleanedPositions = positionsResult.positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));
  return (
    <RoundUploadForm
      positions={cleanedPositions}
      preSelectedPositionId={preSelectedPositionId || ""}
    />
  );
}
