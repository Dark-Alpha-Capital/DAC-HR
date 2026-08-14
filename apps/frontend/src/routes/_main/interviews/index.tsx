import { createFileRoute } from "@tanstack/react-router";
import { InterviewsListPage } from "#/features/interviews/components/interviews-list-page";

export const Route = createFileRoute("/_main/interviews/")({
  head: () => ({
    meta: [{ title: "Interviews" }],
  }),
  component: InterviewsListPage,
});
