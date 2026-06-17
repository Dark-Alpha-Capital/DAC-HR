import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import QuestionUploadForm from "~/components/forms/question-upload-form";
import { Button } from "~/components/ui/button";
import { getPositions, getRoundsByPositionId } from "@workspace/db/queries";
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
  loader: async ({ deps }) => {
    const { positions } = await getPositions();
    const rounds = deps.position
      ? (await getRoundsByPositionId(deps.position)).map((round) => ({
          id: round.id,
          name: round.name,
          description: round.description,
        }))
      : [];

    return {
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      rounds,
      preSelectedPositionId: deps.position,
      preSelectedRoundId: deps.round,
    };
  },
  component: NewQuestionPage,
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
