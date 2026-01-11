import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import {
  getQuestionsWithRounds,
  getPositions,
  getRounds,
} from "@workspace/db/queries";
import QuestionContainer from "./QuestionContainer";
import { Metadata } from "next";
import FilterQuestionSearch from "@/components/filter-question-search";
import FilterQuestionPosition from "@/components/filter-question-position";
import FilterQuestionRound from "@/components/filter-question-round";
import ClearQuestionFiltersButton from "@/components/clear-question-filters-button";
import { cacheLife, cacheTag } from "next/cache";
import PaginationControls from "@/components/pagination-controls";

export const metadata: Metadata = {
  title: "Questions",
  description: "Questions list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 space-y-6">Loading...</div>
      }
    >
      <QuestionsPageContent searchParams={searchParams} />
    </Suspense>
  );
};

const QuestionsPageContent = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const positionIds = Array.isArray(params.position)
    ? params.position
    : params.position
      ? [params.position]
      : [];
  const roundIds = Array.isArray(params.round)
    ? params.round
    : params.round
      ? [params.round]
      : [];

  // Extract page number (default to 1)
  const page = params.page
    ? typeof params.page === "string"
      ? parseInt(params.page, 10)
      : Array.isArray(params.page) && params.page[0]
        ? parseInt(params.page[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Questions</h1>
        <Button asChild>
          <Link href="/questions/new">New Question</Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <FilterQuestionSearch />
        <Suspense fallback={<div className="h-9 w-32" />}>
          <FilterControls />
        </Suspense>
        <ClearQuestionFiltersButton />
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <QuestionsListWrapper
          search={search}
          positionIds={positionIds}
          roundIds={roundIds}
          currentPage={currentPage}
        />
      </Suspense>
    </div>
  );
};

export default page;

async function CachedFilterControls() {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");
  cacheTag("rounds");

  const [{ positions }, rounds] = await Promise.all([
    getPositions(),
    getRounds(),
  ]);

  return (
    <>
      <FilterQuestionPosition positions={positions} />
      <FilterQuestionRound rounds={rounds} />
    </>
  );
}

const FilterControls = CachedFilterControls;

// Component (not cached) reads runtime data
const QuestionsListWrapper = async ({
  search,
  positionIds,
  roundIds,
  currentPage,
}: {
  search: string;
  positionIds: string[];
  roundIds: string[];
  currentPage: number;
}) => {
  return (
    <CachedQuestionsList
      search={search}
      positionIds={positionIds}
      roundIds={roundIds}
      currentPage={currentPage}
    />
  );
};

// Cached component receives data as props
async function CachedQuestionsList({
  search,
  positionIds,
  roundIds,
  currentPage,
}: {
  search: string;
  positionIds: string[];
  roundIds: string[];
  currentPage: number;
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("questions");

  const limit = 50;

  const { questions, total } = await getQuestionsWithRounds(
    search || undefined,
    positionIds.length > 0 ? positionIds : undefined,
    roundIds.length > 0 ? roundIds : undefined,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {search || positionIds.length > 0 || roundIds.length > 0
            ? "No questions found matching your filters."
            : "No questions found."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/questions/new">Add your first question</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QuestionContainer questions={questions} />
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          basePath="/questions"
        />
      )}
    </div>
  );
}
