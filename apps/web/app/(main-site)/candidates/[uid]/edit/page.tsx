import React, { Suspense } from "react";
import { getCandidateById, getPositions } from "@workspace/db/queries";
import BackButton from "@/components/back-button";
import CandidateEditForm from "@/components/forms/candidate-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

type Params = Promise<{ uid: string }>;

const EditCandidatePage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />

      <Suspense fallback={<FormLoadingFallback />}>
        <EditCandidateForm params={params} />
      </Suspense>
    </div>
  );
};

export default EditCandidatePage;

const EditCandidateForm = async ({ params }: { params: Params }) => {
  const { uid } = await params;
  const [candidate, positions] = await Promise.all([
    getCandidateById(uid),
    getPositions(),
  ]);

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Candidate not found</h1>
        <p className="text-muted-foreground mb-4">
          The candidate you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/candidates">Back to Candidates</Link>
        </Button>
      </div>
    );
  }

  return (
    <CandidateEditForm
      candidate={{
        ...candidate,
        positionId: candidate.positionId || undefined,
      }}
      positions={positions.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
};
