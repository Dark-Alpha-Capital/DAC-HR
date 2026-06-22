import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import PositionUploadForm from "~/components/forms/position-upload-form";
import { FormLoadingFallback } from "~/components/skeletons/form-loading-skeleton";

export const Route = createFileRoute("/_main/positions/new")({
  head: () => ({
    meta: [{ title: "New Position" }],
  }),
  component: NewPositionPage,
});

function NewPositionPage() {
  return (
    <div className="narrow-container mx-auto space-y-8 py-6">
      <Button asChild variant="secondary" size="sm">
        <Link to="/positions" search={{} as any}>
          Back to Positions
        </Link>
      </Button>
      <PositionUploadForm />
    </div>
  );
}
