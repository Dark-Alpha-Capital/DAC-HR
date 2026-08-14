import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { QuestionsListPage } from "#/features/questions/components/questions-list-page";
import {
  parseQuestionsSearch,
  questionsIndexQueryOptions,
} from "#/features/questions/server/queries/questions";

export const Route = createFileRoute("/_main/questions/")({
  head: () => ({
    meta: [{ title: "Questions" }],
  }),
  validateSearch: parseQuestionsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseQuestionsSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(questionsIndexQueryOptions(search));
  },
  pendingComponent: () => <ListPageSkeleton />,
  component: QuestionsListPage,
});
