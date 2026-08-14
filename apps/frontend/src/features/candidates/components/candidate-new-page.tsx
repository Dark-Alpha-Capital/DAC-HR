import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import CandidateUploadForm from "#/features/candidates/components/candidate-upload-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";

export function CandidateNewPage() {
  const { positions, positionRounds, userSession } = useLoaderData({
    from: "/_main/candidates/new",
  });

  return (
    <div className="narrow-container mx-auto py-6 space-y-8">
      <Button asChild>
        <Link to="/candidates" search={{} as never}>Back to Candidates</Link>
      </Button>
      <div className="mt-4 md:mt-6 lg:mt-8">
        <CandidateUploadForm
          positions={positions}
          positionRounds={positionRounds as any}
          userSession={userSession as any}
        />
      </div>
    </div>
  );
}
