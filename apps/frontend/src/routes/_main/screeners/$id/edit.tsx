import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import ScreenerEditForm from "~/components/forms/screener-edit-form";
import { loadScreenerEdit } from "~/lib/loaders/screeners";

export const Route = createFileRoute("/_main/screeners/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Screener" }],
  }),
  loader: async ({ params }) => loadScreenerEdit({ data: params.id }),
  component: EditScreenerPage,
  pendingComponent: () => <FormPageSkeleton />,
});

function EditScreenerPage() {
  const { screener } = Route.useLoaderData();

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
      <ScreenerEditForm screener={screener} />
    </div>
  );
}
