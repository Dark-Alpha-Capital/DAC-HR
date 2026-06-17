import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import CandidateUploadForm from "~/components/forms/candidate-upload-form";
import { FormLoadingFallback } from "~/components/skeletons/form-loading-skeleton";
import { getPositions } from "@workspace/db/queries";
import { getSession } from "~/lib/get-session";

export const Route = createFileRoute("/_main/candidates/new")({
  head: () => ({
    meta: [{ title: "New Candidate" }],
  }),
  loader: async () => {
    const session = await getSession();
    const { positions } = await getPositions();
    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      userSession: session?.session,
    };
  },
  component: NewCandidatePage,
});

function NewCandidatePage() {
  const { positions, userSession } = Route.useLoaderData();

  return (
    <div className="narrow-container mx-auto py-6 space-y-8">
        <Button asChild>
          <Link to="/candidates" search="{}">Back to Candidates</Link>
        </Button>
        <div className="mt-4 md:mt-6 lg:mt-8">
          <Suspense fallback={<FormLoadingFallback />}>
            <CandidateUploadForm positions={positions} userSession={userSession as any} />
          </Suspense>
        </div>
      </div>
  );
}
