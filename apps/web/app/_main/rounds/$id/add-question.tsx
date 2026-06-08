import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import QuestionUploadForm from "@/components/forms/question-upload-form";
import { Button } from "@workspace/ui/components/button";
import { getRoundById, getPositions } from "@workspace/db/queries";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import BackButton from "@/components/back-button";
import { db, eq } from "@workspace/db";
import { positionRoundTemplates } from "@workspace/db/schema";

export const Route = createFileRoute("/_main/rounds/$id/add-question")({
  head: () => ({
    meta: [{ title: "Add Question" }],
  }),
  loader: async ({ params }) => {
    const round = await getRoundById(params.id);

    if (!round) {
      return { round: null, positions: [], positionId: "", roundId: params.id };
    }

    const positionRoundTemplate = await db
      .select({
        positionId: positionRoundTemplates.positionId,
      })
      .from(positionRoundTemplates)
      .where(eq(positionRoundTemplates.roundTemplateId, params.id))
      .limit(1);

    const positionId = positionRoundTemplate[0]?.positionId ?? "";
    const { positions } = await getPositions();

    return {
      round,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      positionId,
      roundId: params.id,
    };
  },
  component: AddQuestionPage,
});

function AddQuestionPage() {
  const { round, positions, positionId, roundId } = Route.useLoaderData();

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
        <Suspense fallback={<FormLoadingFallback />}>
          <QuestionUploadForm
            positions={positions}
            preSelectedPositionId={positionId}
            preSelectedRoundId={roundId}
          />
        </Suspense>
      )}
    </div>
  );
}
