import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
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
  const {
    round,
    positions,
    rounds,
    preSelectedPositionId,
    preSelectedRoundId,
  } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const isLoadingRounds = useRouterState({
    select: (s) => s.isLoading,
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <BackButton />

      {!round ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Round not found.</p>
          <Button asChild>
            <Link to="/rounds" search={{} as any}>
              Back to Rounds
            </Link>
          </Button>
        </div>
      ) : (
        <QuestionUploadForm
          positions={positions}
          rounds={rounds}
          preSelectedPositionId={preSelectedPositionId}
          preSelectedRoundId={preSelectedRoundId}
          isLoadingRounds={isLoadingRounds}
          onPositionChange={(positionId) => {
            navigate({
              search: { position: positionId },
            });
          }}
          onResetSearch={() => {
            navigate({ search: { position: "" } });
          }}
        />
      )}
    </div>
  );
}
