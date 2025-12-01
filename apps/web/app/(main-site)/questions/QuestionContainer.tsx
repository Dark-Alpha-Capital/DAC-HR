"use client";

import React, { useMemo, useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon, Columns } from "lucide-react";
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
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
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
  // Flat list of all positions across all rounds (optional in UI)
  positions: QuestionPosition[];
};

interface QuestionContainerProps {
  questions: QuestionWithRounds[];
}

type ViewMode = "grid" | "table" | "kanban";

const QuestionContainer = ({ questions }: QuestionContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Group questions by round for Kanban view,
  // keeping track of which positions are linked via that round.
  const questionsByRound = useMemo(() => {
    const grouped = new Map<
      string,
      {
        roundId: string;
        roundName: string;
        questions: {
          question: QuestionWithRounds;
          positions: QuestionPosition[];
        }[];
      }
    >();

    const unassigned: QuestionWithRounds[] = [];

    questions.forEach((question) => {
      if (!question.rounds || question.rounds.length === 0) {
        unassigned.push(question);
        return;
      }

      question.rounds.forEach((round) => {
        if (!grouped.has(round.id)) {
          grouped.set(round.id, {
            roundId: round.id,
            roundName: round.name || "Unknown",
            questions: [],
          });
        }

        const column = grouped.get(round.id)!;
        if (!column.questions.some((item) => item.question.id === question.id)) {
          column.questions.push({
            question,
            positions: round.positions ?? [],
          });
        }
      });
    });

    const result = Array.from(grouped.values()).sort((a, b) =>
      a.roundName.localeCompare(b.roundName)
    );

    if (unassigned.length > 0) {
      result.push({
        roundId: "unassigned",
        roundName: "Unassigned",
        questions: unassigned.map((question) => ({
          question,
          positions: [],
        })),
      });
    }

    return result;
  }, [questions]);

  const renderRoundsAndPositions = (question: QuestionWithRounds) => {
    if (!question.rounds || question.rounds.length === 0) {
      return (
        <span className="text-xs text-muted-foreground">No rounds/positions</span>
      );
    }

    return (
      <div className="space-y-1">
        {question.rounds.map((round) => (
          <div key={round.id} className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {round.name}
              </Badge>
              {round.positions.length === 0 && (
                <span className="text-[10px] text-muted-foreground">
                  (no linked positions)
                </span>
              )}
            </div>
            {round.positions.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-1">
                {round.positions.map((position) => (
                  <Badge
                    key={position.id}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {position.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as ViewMode);
          }}
          variant="outline"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <Columns className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <h3 className="font-medium text-sm line-clamp-3">
                  {question.questionText}
                </h3>
              </CardHeader>
              <CardContent className="space-y-2 border-t pt-2">
                <div className="text-xs text-muted-foreground">
                  Question belongs to:
                </div>
                {renderRoundsAndPositions(question)}
                <div className="flex items-center gap-1 pt-2 border-t mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    asChild
                  >
                    <Link href={`/questions/${question.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    asChild
                  >
                    <Link href={`/questions/${question.id}/edit`}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <div className="ml-auto">
                    <DeleteQuestionButton questionId={question.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1.5 px-2 text-xs">Question</TableHead>
              <TableHead className="py-1.5 px-2 text-xs">
                Round → Position
              </TableHead>
              <TableHead className="text-right py-1.5 px-2 text-xs">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="py-1.5 px-2 font-medium text-sm max-w-[480px]">
                  <div className="line-clamp-2">{question.questionText}</div>
                </TableCell>
                <TableCell className="py-1.5 px-2 text-xs align-top">
                  {renderRoundsAndPositions(question)}
                </TableCell>
                <TableCell className="text-right py-1.5 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link href={`/questions/${question.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link href={`/questions/${question.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <DeleteQuestionButton questionId={question.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {questionsByRound.map((group) => (
              <div key={group.roundId} className="shrink-0 w-72 flex flex-col">
                <div className="mb-2 px-1">
                  <h3 className="font-semibold text-xs text-muted-foreground">
                    {group.roundName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {group.questions.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {group.questions.map(({ question, positions }) => (
                    <Card
                      key={question.id}
                      className="hover:shadow-sm transition-shadow py-2 px-2"
                    >
                      <CardContent className="p-2">
                        <div className="space-y-1.5">
                          <div>
                            <h4 className="font-medium leading-tight text-sm line-clamp-3">
                              {question.questionText}
                            </h4>
                          </div>
                          {positions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {positions.map((position) => (
                                <Badge
                                  key={position.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {position.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {positions.length === 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              No positions linked to this round
                            </span>
                          )}
                          <div className="flex items-center gap-1 pt-1.5 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <Link href={`/questions/${question.id}`}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              asChild
                            >
                              <Link href={`/questions/${question.id}/edit`}>
                                <Pencil className="h-3 w-3" />
                              </Link>
                            </Button>
                            <div className="ml-auto">
                              <DeleteQuestionButton questionId={question.id} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionContainer;
