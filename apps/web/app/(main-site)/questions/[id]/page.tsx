import React, { Suspense } from "react";
import { getQuestionById } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import BackButton from "@/components/back-button";
import { Pencil, Calendar, Clock } from "lucide-react";
import DeleteQuestionButton from "@/components/delete-question-button";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ id: string }>;

const QuestionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
      <Suspense fallback={<QuestionLoadingSkeleton />}>
        <DisplayQuestion params={params} />
      </Suspense>
    </div>
  );
};

export default QuestionPage;

const QuestionLoadingSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
};

const DisplayQuestion = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const question = await getQuestionById(id);

  if (!question) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Question not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The question you're looking for doesn't exist or has been removed.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/questions">Back to Questions</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

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
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-3xl">{question.questionText}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getQuestionTypeColor(question.questionType)}>
                {question.questionType}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Calendar className="h-3 w-3" />
                Created {formatDate(question.createdAt)}
              </Badge>
              {question.updatedAt &&
                question.updatedAt.getTime() !==
                  question.createdAt.getTime() && (
                  <Badge variant="outline" className="gap-1.5">
                    <Clock className="h-3 w-3" />
                    Updated {formatDate(question.updatedAt)}
                  </Badge>
                )}
            </div>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Question Type</h3>
            <Badge variant={getQuestionTypeColor(question.questionType)}>
              {question.questionType}
            </Badge>
          </div>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex items-center justify-between gap-4 pt-6">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">ID:</span> {question.id}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
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

