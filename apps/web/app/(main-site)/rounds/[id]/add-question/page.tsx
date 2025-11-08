import React, { Suspense } from "react";
import QuestionUploadForm from "@/components/forms/question-upload-form";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getRoundById } from "@workspace/db/queries";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import BackButton from "@/components/back-button";

type Params = Promise<{ id: string }>;

const AddQuestionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-2">Add Question to Round</h1>
        <p className="text-muted-foreground">
          Adding a question to:{" "}
          <span className="font-semibold">{round.name}</span>
        </p>
      </div>
      <QuestionUploadForm roundId={id} onSuccessRedirect={`/rounds/${id}`} />
    </div>
  );
};
