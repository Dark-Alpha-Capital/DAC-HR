import React, { Suspense } from "react";
import { getRoundById, getQuestionsByRoundId } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import Link from "next/link";
import BackButton from "@/components/back-button";
import { Pencil, Calendar, Clock, Plus, Eye } from "lucide-react";
import DeleteRoundButton from "@/components/delete-round-button";
import DeleteQuestionButton from "@/components/delete-question-button";
import { formatDate } from "@/lib/utils";
import { Badge } from "@workspace/ui/components/badge";

type Params = Promise<{ id: string }>;

const RoundPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space-mini container mx-auto">
      <BackButton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Suspense fallback={<RoundLoadingSkeleton />}>
          <DisplayRound params={params} />
        </Suspense>
        <Suspense fallback={<QuestionsLoadingSkeleton />}>
          <DisplayRoundQuestions params={params} />
        </Suspense>
      </div>
    </div>
  );
};

export default RoundPage;

const RoundLoadingSkeleton = () => {
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

const QuestionsLoadingSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-16 w-full bg-muted animate-pulse rounded" />
          <div className="h-16 w-full bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
};

const DisplayRound = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const round = await getRoundById(id);

  if (!round) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Round not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The round you're looking for doesn't exist or has been removed.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/rounds">Back to Rounds</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-3xl">{round.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1.5">
                <Calendar className="h-3 w-3" />
                Created {formatDate(round.createdAt)}
              </Badge>
              {round.updatedAt &&
                round.updatedAt.getTime() !== round.createdAt.getTime() && (
                  <Badge variant="outline" className="gap-1.5">
                    <Clock className="h-3 w-3" />
                    Updated {formatDate(round.updatedAt)}
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
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            {round.description ? (
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {round.description}
              </p>
            ) : (
              <p className="text-muted-foreground italic">
                No description provided for this round.
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex items-center justify-between gap-4 pt-6">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">ID:</span> {round.id}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/rounds/${round.id}/add-question`}>
              <Plus className="h-4 w-4" />
              Add Question
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/rounds/${round.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteRoundButton roundId={round.id} />
        </div>
      </CardFooter>
    </Card>
  );
};

const DisplayRoundQuestions = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const questions = await getQuestionsByRoundId(id);

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
        <CardTitle>Questions</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {questions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No questions are currently linked to this round.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/rounds/${id}/add-question`}>
                <Plus className="h-4 w-4" />
                Add Question
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className={`flex items-start justify-between gap-4 p-4 hover:bg-muted/50 transition-colors ${
                  index !== questions.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{question.questionText}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getQuestionTypeColor(question.questionType)}
                    >
                      {question.questionType}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/questions/${question.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/questions/${question.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteQuestionButton questionId={question.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
