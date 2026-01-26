import React, { Suspense } from "react";
import { getQuestionById } from "@workspace/db/queries";
import BackButton from "@/components/back-button";
import QuestionEditForm from "@/components/forms/question-edit-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

type Params = Promise<{ id: string }>;

const EditQuestionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />

      <Suspense fallback={<FormLoadingFallback />}>
        <EditQuestionForm params={params} />
      </Suspense>
    </div>
  );
};

export default EditQuestionPage;

const EditQuestionForm = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const question = await getQuestionById(id);

  if (!question) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Question not found</h1>
        <p className="text-muted-foreground mb-4">
          The question you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/questions">Back to Questions</Link>
        </Button>
      </div>
    );
  }

  return <QuestionEditForm question={question} />;
};
