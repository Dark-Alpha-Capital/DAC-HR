import React, { Suspense } from "react";
import { getPositionBySlug } from "@workspace/db/queries";
import BackButton from "@/components/back-button";
import PositionEditForm from "@/components/forms/position-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

type Params = Promise<{ slug: string }>;

const EditPositionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />

      <Suspense fallback={<FormLoadingFallback />}>
        <EditPositionForm params={params} />
      </Suspense>
    </div>
  );
};

export default EditPositionPage;

const EditPositionForm = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const position = await getPositionBySlug(slug);

  if (!position) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Position not found</h1>
        <p className="text-muted-foreground mb-4">
          The position you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/positions">Back to Positions</Link>
        </Button>
      </div>
    );
  }

  return <PositionEditForm position={position} />;
};
