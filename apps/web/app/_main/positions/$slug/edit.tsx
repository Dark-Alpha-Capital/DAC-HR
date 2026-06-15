import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { getPositionBySlug } from "@workspace/db/queries";
import PositionEditForm from "@/components/forms/position-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_main/positions/$slug/edit")({
  head: () => ({
    meta: [{ title: "Edit Position" }],
  }),
  loader: async ({ params }) => {
    const position = await getPositionBySlug(params.slug);
    return { position };
  },
  component: EditPositionPage,
});

function EditPositionPage() {
  const { position } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild>
        <Link to="/positions" search={{} as any}>Back to Positions</Link>
      </Button>

      {!position ? (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Position not found</h1>
          <p className="text-muted-foreground mb-4">
            The position you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link to="/positions" search={{} as any}>Back to Positions</Link>
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
