import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { Link, useSearch } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import QuestionContainer from "#/features/questions/components/question-container";
import FilterQuestionSearch from "#/features/questions/components/filter-question-search";
import FilterQuestionPosition from "#/features/questions/components/filter-question-position";
import FilterQuestionRound from "#/features/questions/components/filter-question-round";
import ClearQuestionFiltersButton from "#/features/questions/components/clear-question-filters-button";
import PaginationControls from "#/components/shared/pagination-controls";
import {
  questionsIndexQueryOptions,
  type QuestionsIndexData,
} from "#/features/questions/query-options";

export function QuestionsListPage() {
  const search = useSearch({ from: "/_main/questions/" });
  const { data, isLoading, isFetching }: UseQueryResult<QuestionsIndexData> =
    useQuery(questionsIndexQueryOptions(search));

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
