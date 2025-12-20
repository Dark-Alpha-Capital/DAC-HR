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
        <QuestionsList
          search={search}
          positionIds={positionIds}
          roundIds={roundIds}
        />
      </Suspense>
    </div>
  );
};

export default page;

const FilterControls = async () => {
  const [positions, rounds] = await Promise.all([getPositions(), getRounds()]);

  return (
    <>
      <FilterQuestionPosition positions={positions} />
      <FilterQuestionRound rounds={rounds} />
    </>
  );
};

const QuestionsList = async ({
  search,
  positionIds,
  roundIds,
}: {
  search: string;
  positionIds: string[];
  roundIds: string[];
}) => {
  const questions = await getQuestionsWithRounds();

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No questions found.</p>
        <Button asChild className="mt-4">
          <Link href="/questions/new">Add your first question</Link>
        </Button>
      </div>
    );
  }

  return (
    <QuestionContainer
      questions={questions}
      search={search}
      positionIds={positionIds}
      roundIds={roundIds}
    />
  );
};
