import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import ScreenerUploadForm from "~/components/forms/screener-upload-form";

export const Route = createFileRoute("/_main/screeners/new")({
  head: () => ({
    meta: [{ title: "New Screener" }],
  }),
  component: NewScreenerPage,
  pendingComponent: () => <FormPageSkeleton />,
});

function NewScreenerPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild variant="secondary">
        <Link to="/screeners">Back to Screeners</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Screener</h1>
        <p className="text-muted-foreground mt-1">
          Create a markdown rubric for AI interview analysis.
        </p>
      </div>
      <ScreenerUploadForm />
    </div>
  );
}
