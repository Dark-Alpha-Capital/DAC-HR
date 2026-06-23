import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { loadScreenersIndex } from "~/lib/loaders/screeners";
import ScreenerContainer from "~/components/screener-container";

export const Route = createFileRoute("/_main/screeners/")({
  head: () => ({
    meta: [{ title: "Screeners" }],
  }),
  loader: async () => loadScreenersIndex(),
  component: ScreenersPage,
  pendingComponent: () => <ListPageSkeleton />,
});

function ScreenersPage() {
  const { screeners } = Route.useLoaderData();

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
