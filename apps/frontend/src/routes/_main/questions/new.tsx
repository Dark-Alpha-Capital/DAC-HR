import { FormPageSkeleton } from "~/components/route-skeletons/form-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import QuestionUploadForm from "~/components/forms/question-upload-form";
import { Button } from "~/components/ui/button";
import { loadQuestionsNew } from "~/lib/loaders/questions";

export const Route = createFileRoute("/_main/questions/new")({
  head: () => ({
    meta: [{ title: "New Question" }],
  }),
  loader: async () => loadQuestionsNew(),
  component: NewQuestionPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={4} />,
});

function NewQuestionPage() {
  const { positions } = Route.useLoaderData();

  return (
    <div className="container mx-auto space-y-6 py-8">
      <Button asChild variant="secondary">
        <Link
          to="/questions"
          search={{ search: "", position: [], round: [], page: undefined }}
        >
          Back to Questions
        </Link>
      </Button>

      <QuestionUploadForm positions={positions} />
    </div>
  );
}
