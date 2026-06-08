import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { getRoundById } from "@workspace/db/queries";
import RoundEditForm from "@/components/forms/round-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";

export const Route = createFileRoute("/_main/rounds/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Round" }],
  }),
  loader: async ({ params }) => {
    const round = await getRoundById(params.id);
    return { round };
  },
  component: EditRoundPage,
});

function EditRoundPage() {
  const { round } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild>
        <Link to="/rounds" search={{} as any}>
          Back to Rounds
        </Link>
      </Button>

      {!round ? (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Round not found</h1>
          <p className="text-muted-foreground mb-4">
            The round you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link to="/rounds" search={{} as any}>
              Back to Rounds
            </Link>
          </Button>
        </div>
      ) : (
        <Suspense fallback={<FormLoadingFallback />}>
          <RoundEditForm round={round} />
        </Suspense>
      )}
    </div>
  );
}
