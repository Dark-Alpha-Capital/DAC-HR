import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import QuestionUploadForm from "@/components/forms/question-upload-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import { getPositions } from "@workspace/db/queries";
import { toOptionalString } from "@/lib/parse-search";

export const Route = createFileRoute("/_main/questions/new")({
  head: () => ({
    meta: [{ title: "New Question" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    position: toOptionalString(search.position) ?? "",
    round: toOptionalString(search.round) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const { positions } = await getPositions();
    return {
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      preSelectedPositionId: deps.position,
      preSelectedRoundId: deps.round,
    };
  },
  component: NewQuestionPage,
});

function NewQuestionPage() {
  const { positions, preSelectedPositionId, preSelectedRoundId } =
    Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Button asChild>
        <Link to="/questions" search={{} as any}>Back to Questions</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <QuestionUploadForm
          positions={positions}
          preSelectedPositionId={preSelectedPositionId}
          preSelectedRoundId={preSelectedRoundId}
        />
      </Suspense>
    </div>
  );
}
