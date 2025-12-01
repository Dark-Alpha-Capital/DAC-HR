import React, { Suspense } from "react";
import { getRoundById, getQuestionsByRoundId } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import Link from "next/link";
import BackButton from "@/components/back-button";
import { Pencil, Calendar, Clock, Plus, Eye, HelpCircle } from "lucide-react";
import DeleteRoundButton from "@/components/delete-round-button";
import DeleteQuestionButton from "@/components/delete-question-button";
import { formatDate } from "@/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import { UserIsAdmin } from "@/components/auth-checks";
import { Skeleton } from "@workspace/ui/components/skeleton";

type Params = Promise<{ id: string }>;

const RoundPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <BackButton />

      <Suspense fallback={<RoundLoadingSkeleton />}>
        <DisplayRound params={params} />
      </Suspense>

      <Suspense fallback={<QuestionsLoadingSkeleton />}>
        <DisplayRoundQuestions params={params} />
      </Suspense>
    </div>
  );
};

export default RoundPage;

const RoundLoadingSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-9 w-64" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="pt-4 border-t">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
};

const QuestionsLoadingSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>Questions</CardTitle>
          </div>
          <Skeleton className="h-6 w-8" />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-4 p-4 border rounded-lg"
            >
              <Skeleton className="h-5 flex-1" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          ))}
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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Round not found</h1>
        <p className="text-muted-foreground">
          The round you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/rounds">Back to Rounds</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">{round.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1.5">
              <Calendar className="h-3 w-3" />
              Created {formatDate(round.createdAt)}
            </Badge>
            {round.updatedAt &&
              round.updatedAt.getTime() !== round.createdAt.getTime() && (
                <Badge variant="outline" className="text-xs gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(round.updatedAt)}
                </Badge>
              )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rounds/${round.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <DeleteRoundButton roundId={round.id} />
        </div>
      </div>

      {/* Description */}
      {round.description && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {round.description}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">ID:</span>{" "}
          <span className="font-mono">{round.id}</span>
        </div>
      </div>
    </div>
  );
};

const DisplayRoundQuestions = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const questions = await getQuestionsByRoundId(id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>Questions</CardTitle>
          </div>
          <Badge variant="secondary">{questions.length}</Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No questions are currently linked to this round.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/rounds/${id}/add-question`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question) => (
              <div
                key={question.id}
                className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <p className="font-medium flex-1">{question.questionText}</p>
                <div className="flex gap-2 shrink-0">
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
            <div className="pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/rounds/${id}/add-question`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
