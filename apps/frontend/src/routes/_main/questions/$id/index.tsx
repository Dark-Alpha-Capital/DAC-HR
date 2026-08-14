import { createFileRoute } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { QuestionDetailPage } from "#/features/questions/components/question-detail-page";
import { loadQuestionById } from "#/features/questions/server/queries/questions";

export const Route = createFileRoute("/_main/questions/$id/")({
  head: () => ({
    meta: [{ title: "Question Detail" }],
  }),
  loader: async ({ params }) => loadQuestionById({ data: params.id }),
  component: QuestionDetailPage,
  pendingComponent: () => <DetailPageSkeleton contentBlocks={2} showActions />,
});
