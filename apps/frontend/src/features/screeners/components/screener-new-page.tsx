import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import ScreenerUploadForm from "#/features/screeners/components/screener-upload-form";

export function ScreenerNewPage() {
  const { positions } = useLoaderData({ from: "/_main/screeners/new" });

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
