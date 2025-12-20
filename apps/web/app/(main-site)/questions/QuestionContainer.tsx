"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import DeleteQuestionButton from "@/components/delete-question-button";
import { Badge } from "@workspace/ui/components/badge";

type QuestionPosition = { id: string; name: string };

type QuestionRound = {
  id: string;
  name: string;
  positions: QuestionPosition[];
};

type QuestionWithRounds = {
  id: string;
  questionText: string;
  createdAt: Date;
  updatedAt: Date;
  rounds: QuestionRound[];
  positions: QuestionPosition[];
};

interface QuestionContainerProps {
  questions: QuestionWithRounds[];
  search: string;
  positionIds: string[];
  roundIds: string[];
}

const QuestionContainer = ({
  questions,
  search,
  positionIds,
  roundIds,
}: QuestionContainerProps) => {
  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (!question.questionText.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Position filter
      if (positionIds.length > 0) {
        const questionPositionIds = question.positions.map((p) => p.id);
        const hasMatchingPosition = positionIds.some((posId) =>
          questionPositionIds.includes(posId)
        );
        if (!hasMatchingPosition) {
          return false;
        }
      }

      // Round filter
      if (roundIds.length > 0) {
        const questionRoundIds = question.rounds.map((r) => r.id);
        const hasMatchingRound = roundIds.some((roundId) =>
          questionRoundIds.includes(roundId)
        );
        if (!hasMatchingRound) {
          return false;
        }
      }

      return true;
    });
  }, [questions, search, positionIds, roundIds]);

  const renderRounds = (question: QuestionWithRounds) => {
    if (!question.rounds || question.rounds.length === 0) {
      return (
        <span className="text-xs text-muted-foreground">No rounds</span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {question.rounds.map((round) => (
          <Badge key={round.id} variant="outline" className="text-xs">
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

  if (filteredQuestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No questions found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-3 px-4 w-16">#</TableHead>
            <TableHead className="py-3 px-4">Question</TableHead>
            <TableHead className="py-3 px-4">Round</TableHead>
            <TableHead className="py-3 px-4">Position</TableHead>
            <TableHead className="text-right py-3 px-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredQuestions.map((question, index) => (
            <TableRow key={question.id}>
              <TableCell className="py-3 px-4 text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="py-3 px-4 font-medium max-w-[500px]">
                <div className="line-clamp-2">{question.questionText}</div>
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
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <Link href={`/questions/${question.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <Link href={`/questions/${question.id}/edit`}>
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
