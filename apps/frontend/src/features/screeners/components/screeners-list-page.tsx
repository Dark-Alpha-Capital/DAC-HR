import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import ScreenerContainer from "#/features/screeners/components/screener-container";

export function ScreenersListPage() {
  const { screeners } = useLoaderData({ from: "/_main/screeners/" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Screeners</h1>
        <Button asChild>
          <Link to="/screeners/new">New Screener</Link>
        </Button>
      </div>

      {screeners.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">No screeners yet.</p>
          <Button asChild className="mt-4">
            <Link to="/screeners/new">Create your first screener</Link>
          </Button>
        </div>
      ) : (
        <ScreenerContainer screeners={screeners} />
      )}
    </div>
  );
}

export function ScreenersListPending() {
  return <ListPageSkeleton />;
}
