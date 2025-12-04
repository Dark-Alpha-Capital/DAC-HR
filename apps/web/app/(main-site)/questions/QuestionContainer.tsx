"use client";

import React, { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
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

type ViewMode = "grid" | "table";

const QuestionContainer = ({ questions }: QuestionContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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
      ) : (
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
      )}
    </div>
  );
};

export default QuestionContainer;
