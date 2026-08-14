import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import PositionEditForm from "#/features/positions/components/position-edit-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";
import { Button } from "#/components/ui/button";

export function PositionEditPage() {
  const { position } = useLoaderData({ from: "/_main/positions/$slug/edit" });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild>
        <Link to="/positions" search={{} as never}>Back to Positions</Link>
      </Button>

      {!position ? (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Position not found</h1>
          <p className="text-muted-foreground mb-4">
            The position you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link to="/positions" search={{} as never}>Back to Positions</Link>
          </Button>
        </div>
      ) : (
        <Suspense fallback={<FormLoadingFallback />}>
          <PositionEditForm position={position} />
        </Suspense>
      )}
    </div>
  );
}
