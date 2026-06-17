import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { loadQuestionsIndex } from "~/lib/loaders/questions";
import QuestionContainer from "~/components/question-container";
import FilterQuestionSearch from "~/components/filter-question-search";
import FilterQuestionPosition from "~/components/filter-question-position";
import FilterQuestionRound from "~/components/filter-question-round";
import ClearQuestionFiltersButton from "~/components/clear-question-filters-button";
import PaginationControls from "~/components/pagination-controls";
import { toPageNumber, toStringArray } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/questions/")({
  head: () => ({
    meta: [{ title: "Questions" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    search: typeof search.search === "string" ? search.search : "",
    position: toStringArray(search.position as string | string[] | undefined) ?? [],
    round: toStringArray(search.round as string | string[] | undefined) ?? [],
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => loadQuestionsIndex({ data: deps }),
  component: QuestionsPage,
});

function QuestionsPage() {
  const {
    positions,
    rounds,
    questions,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    hasFilters,
  } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Questions</h1>
        <Button asChild>
          <Link to="/questions/new" search="{}">New Question</Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <FilterQuestionSearch />
        <FilterQuestionPosition positions={positions} />
        <FilterQuestionRound rounds={rounds} />
        <ClearQuestionFiltersButton />
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No questions found matching your filters."
              : "No questions found."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/questions/new" search="{}">Add your first question</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <QuestionContainer questions={questions} />
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
