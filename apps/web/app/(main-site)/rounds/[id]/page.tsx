import React, { Suspense } from "react";
import {
  getRoundById,
  getQuestionsByRoundId,
  getPositionsByRoundId,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  Pencil,
  Calendar,
  Clock,
  Plus,
  Eye,
  HelpCircle,
  Briefcase,
} from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Question</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-full" />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const DisplayRound = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const [round, positions] = await Promise.all([
    getRoundById(id),
    getPositionsByRoundId(id),
  ]);

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
            {positions.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1.5">
                <Briefcase className="h-3 w-3" />
                {positions.length === 1
                  ? (positions[0]?.name ?? "Unknown Position")
                  : `${positions.length} Positions`}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs gap-1.5">
              <Calendar className="h-3 w-3" />
              Created {formatDate(round.createdAt)}
            </Badge>
            {round.updatedAt &&
              round.updatedAt.getTime() !== round.createdAt.getTime() && (
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(round.updatedAt)}
                </Badge>
              )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/rounds/${round.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <DeleteRoundButton roundId={round.id} />
        </div>
      </div>

      {/* Position Information */}
      {positions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Position{positions.length > 1 ? "s" : ""}
          </h2>
          <div className="flex flex-wrap gap-2">
            {positions.map((pos) => (
              <Button
                key={pos.id}
                variant="secondary"
                size="sm"
                asChild
                className="h-auto py-1.5"
              >
                <Link href={`/positions/${pos.slug}`}>{pos.name}</Link>
              </Button>
            ))}
          </div>
        </div>
      )}

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Questions</h2>
          {questions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {questions.length}
            </Badge>
          )}
        </div>
        <Button variant="default" size="sm" asChild>
          <Link href={`/rounds/${id}/add-question`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Link>
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12">
          <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No questions are currently linked to this round.
          </p>
          <Button variant="secondary" asChild>
            <Link href={`/rounds/${id}/add-question`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question, index) => (
              <TableRow key={question.id}>
                <TableCell className="text-muted-foreground font-medium">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  {question.questionText}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/questions/${question.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/questions/${question.id}/edit`}>
                        <Pencil className="h-4 w-4" />
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
