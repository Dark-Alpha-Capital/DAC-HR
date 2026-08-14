import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { QuestionEditPage } from "#/features/questions/components/question-edit-page";
import { loadQuestionById } from "#/features/questions/server/queries/questions";

export const Route = createFileRoute("/_main/questions/$id/edit")({
  head: () => ({
    meta: [{ title: "Edit Question" }],
  }),
  loader: async ({ params }) => loadQuestionById({ data: params.id }),
  component: QuestionEditPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={7} />,
});
