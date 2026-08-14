import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Link } from "@tanstack/react-router";
import { Eye, Pencil } from "lucide-react";
import DeleteQuestionButton from "#/features/questions/components/delete-question-button";
import BulkDeleteQuestionsButton from "#/features/questions/components/bulk-delete-questions-button";
import { Badge } from "#/components/ui/badge";
import { getQuestionTypeLabel } from "#/features/questions/helpers";

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
  currentPage?: number;
  limit?: number;
}

const QuestionContainer = ({
  questions,
  currentPage = 1,
  limit = 50,
}: QuestionContainerProps) => {
  const startIndex = (currentPage - 1) * limit;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allQuestionIds = useMemo(
    () => questions.map((question) => question.id),
    [questions],
  );

  const isAllSelected = useMemo(
    () => questions.length > 0 && selectedIds.size === questions.length,
    [questions.length, selectedIds.size],
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(allQuestionIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectQuestion = (questionId: string, checked: boolean) => {
    const nextSelected = new Set(selectedIds);
    if (checked) {
      nextSelected.add(questionId);
    } else {
      nextSelected.delete(questionId);
    }
    setSelectedIds(nextSelected);
  };

  const handleDeleteComplete = () => {
    setSelectedIds(new Set());
  };

  useEffect(() => {
    setSelectedIds((current) => {
      const visibleIds = new Set(allQuestionIds);
      const next = new Set(Array.from(current).filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [allQuestionIds]);

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
      {selectedIds.size > 0 ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <span className="text-sm font-medium">
            {selectedIds.size} question{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <BulkDeleteQuestionsButton
            selectedIds={Array.from(selectedIds)}
            onDeleteComplete={handleDeleteComplete}
          />
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-4 py-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
                aria-label="Select all questions"
              />
            </TableHead>
            <TableHead className="w-16 px-4 py-3">#</TableHead>
            <TableHead className="px-4 py-3">Question</TableHead>
            <TableHead className="px-4 py-3">Type</TableHead>
            <TableHead className="px-4 py-3">Round</TableHead>
            <TableHead className="px-4 py-3">Position</TableHead>
            <TableHead className="px-4 py-3 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((question, index) => {
            const isSelected = selectedIds.has(question.id);

            return (
              <TableRow
                key={question.id}
                className={isSelected ? "bg-muted/50" : ""}
              >
                <TableCell className="px-4 py-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleSelectQuestion(question.id, checked === true)
                    }
                    aria-label={`Select question ${index + 1}`}
                  />
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {startIndex + index + 1}
                </TableCell>
                <TableCell className="max-w-[500px] px-4 py-3 font-medium">
                  <div className="line-clamp-2">{question.questionText}</div>
                </TableCell>
                <TableCell className="px-4 py-3 align-top">
                  <Badge variant="secondary" className="text-xs">
                    {getQuestionTypeLabel(question.questionType)}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 align-top">
                  {renderRounds(question)}
                </TableCell>
                <TableCell className="px-4 py-3 align-top">
                  {renderPositions(question)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default QuestionContainer;
