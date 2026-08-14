import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import CandidateEditForm from "#/features/candidates/components/candidate-edit-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";
import BackButton from "#/components/shared/back-button";

export function CandidateEditPage() {
  const { candidate } = useLoaderData({ from: "/_main/candidates/$uid/edit" });

  if (!candidate) {
    return (
      <div className="narrow-container mx-auto py-8 space-y-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Candidate not found</h1>
        <p className="text-muted-foreground mb-4">
          The candidate you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link to="/candidates" search={{} as never}>
            Back to Candidates
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="narrow-container mx-auto py-8 space-y-6">
      <BackButton />
      <div className="mt-4 md:mt-8 lg:mt-12">
        <Suspense fallback={<FormLoadingFallback />}>
          <CandidateEditForm
            candidate={{
              ...candidate,
              positionIds: (candidate as any).positionIds || [],
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
