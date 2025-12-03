import React, { Suspense } from "react";
import { getCandidateById, getPositions } from "@workspace/db/queries";
import CandidateEditForm from "@/components/forms/candidate-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { UserAuthenticated } from "@/components/auth-checks";
import { ArrowLeft } from "lucide-react";

type Params = Promise<{ uid: string }>;

const EditCandidatePage = async ({ params }: { params: Params }) => {
  return (
    <div className="narrow-container mx-auto py-8 space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

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
    <div>
      <Link href={`/candidates/${uid}`}>
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Candidate
        </Button>
      </Link>

      <div className="mt-4 md:mt-8 lg:mt-12">
        <CandidateEditForm
          candidate={{
            ...candidate,
            positionId: candidate.positionId || undefined,
          }}
          positions={positions.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  );
};
