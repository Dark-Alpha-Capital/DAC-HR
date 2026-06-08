import { createFileRoute, Link } from "@tanstack/react-router";
import { getQuestionById } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import BackButton from "@/components/back-button";
import { Pencil, Calendar, Clock } from "lucide-react";
import DeleteQuestionButton from "@/components/delete-question-button";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_main/questions/$id/")({
  head: () => ({
    meta: [{ title: "Question Detail" }],
  }),
  loader: async ({ params }) => {
    const question = await getQuestionById(params.id);
    return { question };
  },
  component: QuestionDetailPage,
});

function QuestionDetailPage() {
  const { question } = Route.useLoaderData();

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
              <Link to="/questions" search={{} as any}>Back to Questions</Link>
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
