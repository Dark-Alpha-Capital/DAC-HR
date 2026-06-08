import React, { Suspense } from "react";
import QuestionUploadForm from "@/components/forms/question-upload-form";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getRoundById, getPositions } from "@workspace/db/queries";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import BackButton from "@/components/back-button";
import { db, eq } from "@workspace/db";
import { positionRoundTemplates } from "@workspace/db/schema";

type Params = Promise<{ id: string }>;

const AddQuestionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <BackButton />
      </Suspense>
      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayAddQuestionForm params={params} />
      </Suspense>
    </div>
  );
};

export default AddQuestionPage;

const DisplayAddQuestionForm = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const round = await getRoundById(id);

  if (!round) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Round not found.</p>
        <Button asChild>
          <Link href="/rounds">Back to Rounds</Link>
        </Button>
      </div>
    );
  }

  // Get the position associated with this round
  const positionRoundTemplate = await db
    .select({
      positionId: positionRoundTemplates.positionId,
    })
    .from(positionRoundTemplates)
    .where(eq(positionRoundTemplates.roundTemplateId, id))
    .limit(1);

  const positionId = positionRoundTemplate[0]?.positionId || "";

  // Get all positions for the form
  const positions = await getPositions();

  return (
    <div className="space-y-4">
      <QuestionUploadForm
        positions={positions.positions.map((position) => ({
          id: position.id,
          name: position.name,
        }))}
        preSelectedPositionId={positionId}
        preSelectedRoundId={id}
      />
    </div>
  );
};
