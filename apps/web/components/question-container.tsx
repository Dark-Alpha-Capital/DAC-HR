"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Eye, Pencil } from "lucide-react";
import DeleteQuestionButton from "@/components/delete-question-button";
import { Badge } from "@workspace/ui/components/badge";
import { getQuestionTypeLabel } from "@/lib/question-type-label";

type QuestionPosition = { id: string; name: string };

type QuestionRound = {
  id: string;
  name: string;
  positions: QuestionPosition[];
};

type QuestionWithRounds = {
  id: string;
  questionText: string;
  questionType: string;
  createdAt: Date;
  updatedAt: Date;
  rounds: QuestionRound[];
  positions: QuestionPosition[];
};

interface QuestionContainerProps {
  questions: QuestionWithRounds[];
}

const QuestionContainer = ({ questions }: QuestionContainerProps) => {
  const renderRounds = (question: QuestionWithRounds) => {
    if (!question.rounds || question.rounds.length === 0) {
      return <span className="text-xs text-muted-foreground">No rounds</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {question.rounds.map((round) => (
          <Badge key={round.id} variant="secondary" className="text-xs">
            {round.name}
          </Badge>
        ))}
      </div>
    );
  };

  const renderPositions = (question: QuestionWithRounds) => {
    if (!question.positions || question.positions.length === 0) {
      return (
        <span className="text-xs text-muted-foreground">No positions</span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {question.positions.map((position) => (
          <Badge key={position.id} variant="secondary" className="text-xs">
            {position.name}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-3 px-4 w-16">#</TableHead>
            <TableHead className="py-3 px-4">Question</TableHead>
            <TableHead className="py-3 px-4">Type</TableHead>
            <TableHead className="py-3 px-4">Round</TableHead>
            <TableHead className="py-3 px-4">Position</TableHead>
            <TableHead className="text-right py-3 px-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((question, index) => (
            <TableRow key={question.id}>
              <TableCell className="py-3 px-4 text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="py-3 px-4 font-medium max-w-[500px]">
                <div className="line-clamp-2">{question.questionText}</div>
              </TableCell>
              <TableCell className="py-3 px-4 align-top">
                <Badge variant="secondary" className="text-xs">
                  {getQuestionTypeLabel(question.questionType)}
                </Badge>
              </TableCell>
              <TableCell className="py-3 px-4 align-top">
                {renderRounds(question)}
              </TableCell>
              <TableCell className="py-3 px-4 align-top">
                {renderPositions(question)}
              </TableCell>
              <TableCell className="text-right py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <Link to="/questions/$id" params={{ id: question.id }}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <Link
                      to="/questions/$id/edit"
                      params={{ id: question.id }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteQuestionButton questionId={question.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default QuestionContainer;
