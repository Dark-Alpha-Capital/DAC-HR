import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import CandidateUploadForm from "#/features/candidates/components/candidate-upload-form";

// SAFETY: the candidates route's validateSearch fills in defaults for all
// search params, so an empty search object is a valid navigation target;
// `never` only satisfies tanstack's required-search typing.
const emptyCandidatesSearch = {} as never;

export function CandidateNewPage() {
  const { positions, positionRounds, userSession } = useLoaderData({
    from: "/_main/candidates/new",
  });

  return (
    <div className="narrow-container mx-auto py-6 space-y-8">
      <Button asChild>
        <Link to="/candidates" search={emptyCandidatesSearch}>Back to Candidates</Link>
      </Button>
      <div className="mt-4 md:mt-6 lg:mt-8">
        <CandidateUploadForm
          positions={positions}
          positionRounds={positionRounds}
          userSession={userSession}
        />
      </div>
    </div>
  );
}
