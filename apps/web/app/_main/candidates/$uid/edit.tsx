import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getPositions } from "@workspace/db/queries";
import CandidateEditForm from "@/components/forms/candidate-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import BackButton from "@/components/back-button";

export const Route = createFileRoute("/_main/candidates/$uid/edit")({
  head: () => ({
    meta: [{ title: "Edit Candidate" }],
  }),
  loader: async ({ params }) => {
    const [candidate, { positions }] = await Promise.all([
      getCandidateById(params.uid),
      getPositions(),
    ]);

    return {
      candidate,
      positions: positions.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    };
  },
  component: EditCandidatePage,
});

function EditCandidatePage() {
  const { candidate, positions } = Route.useLoaderData();

  if (!candidate) {
    return (
      <div className="narrow-container mx-auto py-8 space-y-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Candidate not found</h1>
        <p className="text-muted-foreground mb-4">
          The candidate you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link to="/candidates" search={{} as any}>Back to Candidates</Link>
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
              positionId: candidate.positionId || undefined,
            }}
            positions={positions}
          />
        </Suspense>
      </div>
    </div>
  );
}
