import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import RoundUploadForm from "~/components/forms/round-upload-form";
import { FormLoadingFallback } from "~/components/skeletons/form-loading-skeleton";
import { Button } from "~/components/ui/button";
import { loadRoundsNew } from "~/lib/loaders/rounds";
import { toOptionalString } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/rounds/new")({
  head: () => ({
    meta: [{ title: "New Round" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    position: toOptionalString(search.position) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => loadRoundsNew({ data: deps }),
  component: NewRoundPage,
});

function NewRoundPage() {
  const { positions, preSelectedPositionId } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild>
        <Link to="/rounds" search={{} as any}>Back to Rounds</Link>
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
