import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import QuestionUploadForm from "~/components/forms/question-upload-form";
import { Button } from "~/components/ui/button";
import {
  getFirstPositionIdForRoundTemplate,
  getRoundById,
  getPositions,
  getRoundsByPositionId,
} from "@workspace/db/queries";
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
  loader: async ({ params, deps }) => {
    const round = await getRoundById(params.id);

    if (!round) {
      return {
        round: null,
        positions: [],
        rounds: [],
        preSelectedPositionId: "",
        preSelectedRoundId: params.id,
      };
    }

    const defaultPositionId = await getFirstPositionIdForRoundTemplate(
      params.id,
    );
    const positionId = deps.position || defaultPositionId || "";
    const { positions } = await getPositions();
    const rounds = positionId
      ? (await getRoundsByPositionId(positionId)).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        }))
      : [];

    return {
      round,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      rounds,
      preSelectedPositionId: positionId,
      preSelectedRoundId: params.id,
    };
  },
  component: AddQuestionPage,
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
