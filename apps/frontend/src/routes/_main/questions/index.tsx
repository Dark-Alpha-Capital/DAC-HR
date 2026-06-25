import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import QuestionContainer from "~/components/question-container";
import FilterQuestionSearch from "~/components/filter-question-search";
import FilterQuestionPosition from "~/components/filter-question-position";
import FilterQuestionRound from "~/components/filter-question-round";
import ClearQuestionFiltersButton from "~/components/clear-question-filters-button";
import PaginationControls from "~/components/pagination-controls";
import { loadQuestionsIndex } from "~/lib/loaders/questions";
import { toPageNumber, toStringArray } from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

function parseQuestionsSearch(search: Record<string, unknown>) {
  return {
    search: typeof search.search === "string" ? search.search : "",
    position:
      toStringArray(search.position as string | string[] | undefined) ?? [],
    round: toStringArray(search.round as string | string[] | undefined) ?? [],
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

type QuestionsIndexSearch = ReturnType<typeof parseQuestionsSearch>;

function questionsIndexQueryOptions(deps: QuestionsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.questions.list(deps),
    queryFn: () => loadQuestionsIndex({ data: deps }),
  });
}

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
  component: QuestionsPage,
});

function QuestionsPage() {
  const search = Route.useSearch();
  const { data, isLoading, isFetching } = useQuery({
    ...questionsIndexQueryOptions(search),
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) {
    return <ListPageSkeleton />;
  }

  if (!data) {
    return null;
  }

  const {
    positions,
    rounds,
    questions,
    currentPage,
    limit,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Questions</h1>
        <Button asChild>
          <Link to="/questions/new">New Question</Link>
        </Button>
      </div>

      <div
        className="flex items-center gap-4 flex-wrap transition-opacity"
        style={{ opacity: isFetching ? 0.7 : 1 }}
      >
        <FilterQuestionSearch />
        <FilterQuestionPosition positions={positions} />
        <FilterQuestionRound rounds={rounds} />
        <ClearQuestionFiltersButton />
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No questions found matching your filters."
              : "No questions found."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/questions/new">Add your first question</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <QuestionContainer
            questions={questions}
            currentPage={currentPage}
            limit={limit}
          />
          {totalPages > 1 ? (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              basePath="/questions"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
