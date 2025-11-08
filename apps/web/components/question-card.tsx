import React from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Eye, Pencil } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { questionBank } from "@workspace/db/schema";
import DeleteQuestionButton from "./delete-question-button";
import { Badge } from "@workspace/ui/components/badge";

type Question = InferSelectModel<typeof questionBank>;

interface QuestionCardProps {
  question: Question;
}

const QuestionCard = ({ question }: QuestionCardProps) => {
  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case "behavioral":
        return "default";
      case "technical":
        return "secondary";
      case "skill":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="line-clamp-2">{question.questionText}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant={getQuestionTypeColor(question.questionType)}>
            {question.questionType}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/questions/${question.id}`}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/questions/${question.id}/edit`}>
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

