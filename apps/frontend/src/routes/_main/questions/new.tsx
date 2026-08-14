import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { QuestionNewPage } from "#/features/questions/components/question-new-page";
import { loadQuestionsNew } from "#/features/questions/server/queries/questions";

export const Route = createFileRoute("/_main/questions/new")({
  head: () => ({
    meta: [{ title: "New Question" }],
  }),
  loader: async () => loadQuestionsNew(),
  component: QuestionNewPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={4} />,
});
