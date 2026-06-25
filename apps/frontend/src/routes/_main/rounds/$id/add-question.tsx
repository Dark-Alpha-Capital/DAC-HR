import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import QuestionUploadForm from "~/components/forms/question-upload-form";
import { Button } from "~/components/ui/button";
import { loadRoundAddQuestion } from "~/lib/loaders/rounds";
import BackButton from "~/components/back-button";
import { toOptionalString } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/rounds/$id/add-question")({
  head: () => ({
    meta: [{ title: "Add Question" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    position: toOptionalString(search.position) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) =>
    loadRoundAddQuestion({
      data: { roundId: params.id, position: deps.position },
    }),
  component: AddQuestionPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={4} />,
});

function AddQuestionPage() {
  const { round, positions, preSelectedPositionId, preSelectedRoundId } =
    Route.useLoaderData();

  return (
    <div className="container mx-auto space-y-6 py-8">
      <BackButton />

      {!round ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-muted-foreground">Round not found.</p>
          <Button asChild>
            <Link to="/rounds" search={{ type: undefined, page: undefined }}>
              Back to Rounds
            </Link>
          </Button>
        </div>
      ) : (
        <QuestionUploadForm
          positions={positions}
          preSelectedPositionId={preSelectedPositionId}
          preSelectedRoundId={preSelectedRoundId}
        />
      )}
    </div>
  );
}
