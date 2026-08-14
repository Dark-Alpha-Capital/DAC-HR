import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import RoundEditForm from "#/features/rounds/components/round-edit-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";
import { Button } from "#/components/ui/button";

export function RoundEditPage() {
  const { round } = useLoaderData({ from: "/_main/rounds/$id/edit" });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild>
        <Link to="/rounds" search={{} as never}>
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
            <Link to="/rounds" search={{} as never}>
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
