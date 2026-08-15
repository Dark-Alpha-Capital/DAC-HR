import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import BackButton from "#/components/shared/back-button";
import QuestionEditForm from "#/features/questions/components/question-edit-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";
import { Button } from "#/components/ui/button";

export function QuestionEditPage() {
  const { question } = useLoaderData({ from: "/_main/questions/$id/edit" });

  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />

      {!question ? (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Question not found</h1>
          <p className="text-muted-foreground mb-4">
            The question you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link
              to="/questions"
              search={{ search: "", position: [], round: [], page: undefined }}
            >
              Back to Questions
            </Link>
          </Button>
        </div>
      ) : (
        <Suspense fallback={<FormLoadingFallback />}>
          <QuestionEditForm question={question} />
        </Suspense>
      )}
    </div>
  );
}
