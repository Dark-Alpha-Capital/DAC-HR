import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getQuestionsWithRounds } from "@workspace/db/queries";
import QuestionContainer from "./QuestionContainer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions",
  description: "Questions list",
};

const page = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Questions</h1>
      </div>

      <div>
        <Button asChild>
          <Link href="/questions/new">New Question</Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <QuestionsList />
      </Suspense>
    </div>
  );
};

export default page;

const QuestionsList = async () => {
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

  return <QuestionContainer questions={questions} />;
};
