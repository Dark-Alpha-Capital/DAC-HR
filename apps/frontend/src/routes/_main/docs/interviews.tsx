import { createFileRoute } from "@tanstack/react-router";
import { InterviewsDocsPage as InterviewsPage } from "#/features/docs/components/interviews-page";

export const Route = createFileRoute("/_main/docs/interviews")({
  head: () => ({
    meta: [{ title: "Interviews - DAC HR" }],
  }),
  component: InterviewsPage,
});
