import React from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import type { Question } from "./columns";

type QuestionWithRounds = {
  id: string;
  questionText: string;
  createdAt: Date;
  updatedAt: Date;
  rounds: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
};

const QuestionContainer = ({
  questions,
}: {
  questions: QuestionWithRounds[];
}) => {
  // Transform questions to match the Question type expected by columns
  const transformedQuestions: Question[] = questions.map((question) => ({
    id: question.id,
    questionText: question.questionText,
    rounds: question.rounds,
    positions: question.positions,
  }));

  return (
    <div>
      <DataTable columns={columns} data={transformedQuestions} />
    </div>
  );
};

export default QuestionContainer;

