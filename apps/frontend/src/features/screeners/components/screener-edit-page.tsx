import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import ScreenerEditForm from "#/features/screeners/components/screener-edit-form";

export function ScreenerEditPage() {
  const { screener, positions } = useLoaderData({
    from: "/_main/screeners/$id/edit",
  });

  if (!screener) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-xl font-medium">Screener not found</h1>
        <Button asChild className="mt-4">
          <Link to="/screeners">Back to Screeners</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild variant="secondary">
        <Link to="/screeners">Back to Screeners</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Screener</h1>
        <p className="text-muted-foreground mt-1">{screener.name}</p>
      </div>
      <ScreenerEditForm screener={screener} positions={positions} />
    </div>
  );
}
