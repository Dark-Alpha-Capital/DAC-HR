import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, Pencil } from "lucide-react";
import type { Question } from "@workspace/db/schema";
import DeleteQuestionButton from "./delete-question-button";

interface QuestionCardProps {
  question: Question;
}

const QuestionCard = ({ question }: QuestionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="line-clamp-2">{question.questionText}</CardTitle>
      </CardHeader>
      <CardFooter className="border-t">
        <div className="flex gap-2 w-full">
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/questions/${question.id}` as any}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/questions/${question.id}/edit` as any}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteQuestionButton questionId={question.id} />
        </div>
      </CardFooter>
    </Card>
  );
};

export default QuestionCard;
