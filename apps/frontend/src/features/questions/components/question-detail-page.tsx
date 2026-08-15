import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Badge } from "#/components/ui/badge";
import BackButton from "#/components/shared/back-button";
import { Pencil, Calendar, Clock } from "lucide-react";
import DeleteQuestionButton from "#/features/questions/components/delete-question-button";
import { formatDate } from "#/lib/utils";
import { getQuestionTypeLabel } from "#/features/questions/helpers";

export function QuestionDetailPage() {
  const { question } = useLoaderData({ from: "/_main/questions/$id/" });

  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />

      {!question ? (
        <Card>
          <CardHeader>
            <CardTitle>Question not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The question you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link
                to="/questions"
                search={{ search: "", position: [], round: [], page: undefined }}
              >
                Back to Questions
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <CardTitle className="text-3xl">
                  {question.questionText}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {getQuestionTypeLabel(question.questionType)}
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Created {formatDate(question.createdAt)}
                  </Badge>
                  {question.updatedAt &&
                  question.updatedAt.getTime() !==
                    question.createdAt.getTime() ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(question.updatedAt)}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </CardHeader>
          {question.questionType === "mcq" && question.options?.length ? (
            <>
              <Separator />
              <CardContent className="space-y-2">
                <p className="text-sm font-medium">Options</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {question.options.map((option: { id: string; text: string }) => (
                    <li key={option.id}>{option.text}</li>
                  ))}
                </ol>
              </CardContent>
            </>
          ) : null}
          <Separator />
          <CardFooter className="flex items-center justify-between gap-4 pt-6">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">ID:</span> {question.id}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" asChild>
                <Link to="/questions/$id/edit" params={{ id: question.id }}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DeleteQuestionButton questionId={question.id} />
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
