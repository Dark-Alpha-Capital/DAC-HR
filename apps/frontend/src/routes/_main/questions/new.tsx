import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import QuestionUploadForm from "~/components/forms/question-upload-form";
import { Button } from "~/components/ui/button";
import { loadQuestionsNew } from "~/lib/loaders/questions";
import { toOptionalString } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/questions/new")({
  head: () => ({
    meta: [{ title: "New Question" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    position: toOptionalString(search.position) ?? "",
    round: toOptionalString(search.round) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => loadQuestionsNew({ data: deps }),
  component: NewQuestionPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={7} />,
});

function NewQuestionPage() {
  const {
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
      <Button asChild>
        <Link to="/questions" search={{} as any}>
          Back to Questions
        </Link>
      </Button>

      <QuestionUploadForm
        positions={positions}
        rounds={rounds}
        preSelectedPositionId={preSelectedPositionId}
        preSelectedRoundId={preSelectedRoundId}
        isLoadingRounds={isLoadingRounds}
        onPositionChange={(positionId) => {
          navigate({
            search: { position: positionId, round: "" },
          });
        }}
        onResetSearch={() => {
          navigate({ search: { position: "", round: "" } });
        }}
      />
    </div>
  );
}
