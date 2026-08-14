import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import RoundUploadForm from "#/features/rounds/components/round-upload-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";
import { Button } from "#/components/ui/button";

export function RoundNewPage() {
  const { positions, preSelectedPositionId } = useLoaderData({
    from: "/_main/rounds/new",
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild>
        <Link to="/rounds" search={{} as never}>Back to Rounds</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <RoundUploadForm
          positions={positions}
          preSelectedPositionId={preSelectedPositionId}
        />
      </Suspense>
    </div>
  );
}
