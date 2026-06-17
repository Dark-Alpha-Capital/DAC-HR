import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { loadQuestionById } from "~/lib/loaders/questions";
import BackButton from "~/components/back-button";
import QuestionEditForm from "~/components/forms/question-edit-form";
import { FormLoadingFallback } from "~/components/skeletons/form-loading-skeleton";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_main/questions/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Question" }],
  }),
  loader: async ({ params }) => loadQuestionById({ data: params.id }),
  component: EditQuestionPage,
});

function EditQuestionPage() {
  const { question } = Route.useLoaderData();

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
            <Link to="/questions" search={{} as any}>Back to Questions</Link>
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
