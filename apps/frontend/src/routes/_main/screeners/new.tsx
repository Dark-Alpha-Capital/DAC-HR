import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import ScreenerUploadForm from "~/components/forms/screener-upload-form";
import { loadScreenerFormOptions } from "~/lib/loaders/screeners";

export const Route = createFileRoute("/_main/screeners/new")({
  head: () => ({
    meta: [{ title: "New Screener" }],
  }),
  loader: async () => loadScreenerFormOptions(),
  component: NewScreenerPage,
  pendingComponent: () => <FormPageSkeleton />,
});

function NewScreenerPage() {
  const { positions } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild variant="secondary">
        <Link to="/screeners">Back to Screeners</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Screener</h1>
        <p className="text-muted-foreground mt-1">
          Create a markdown rubric for AI interview analysis, attached to a
          position.
        </p>
      </div>
      <ScreenerUploadForm positions={positions} />
    </div>
  );
}
