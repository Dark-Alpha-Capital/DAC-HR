import { createFileRoute } from "@tanstack/react-router";
import { QuestionsDocsPage as QuestionsPage } from "#/features/docs/components/questions-page";

export const Route = createFileRoute("/_main/docs/questions")({
  head: () => ({
    meta: [{ title: "Questions - DAC HR" }],
  }),
  component: QuestionsPage,
});
