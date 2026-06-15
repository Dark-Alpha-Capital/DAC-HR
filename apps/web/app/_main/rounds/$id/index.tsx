import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getRoundById,
  getQuestionsByRoundId,
  getPositionsByRoundId,
} from "@workspace/db/queries";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_main/rounds/$id/")({
  head: () => ({
    meta: [{ title: "Round Detail" }],
  }),
  loader: async ({ params }) => {
    const [round, positions, questions] = await Promise.all([
      getRoundById(params.id),
      getPositionsByRoundId(params.id),
      getQuestionsByRoundId(params.id),
    ]);

    return { round, positions, questions };
  },
  component: RoundDetailPage,
});

function RoundDetailPage() {
  const { round, positions, questions } = Route.useLoaderData();
  const { id } = Route.useParams();

  if (!round) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <BackButton />
        <h1 className="text-2xl font-semibold">Round not found</h1>
        <p className="text-muted-foreground">
          The round you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button asChild>
          <Link to="/rounds" search={{} as any}>Back to Rounds</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <BackButton />

      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl font-bold">{round.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {positions.length > 0 ? (
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Briefcase className="h-3 w-3" />
                  {positions.length === 1
                    ? (positions[0]?.name ?? "Unknown Position")
                    : `${positions.length} Positions`}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="text-xs gap-1.5">
                <Calendar className="h-3 w-3" />
                Created {formatDate(round.createdAt)}
              </Badge>
              {round.updatedAt &&
              round.updatedAt.getTime() !== round.createdAt.getTime() ? (
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(round.updatedAt)}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link to="/rounds/$id/edit" params={{ id: round.id }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <DeleteRoundButton roundId={round.id} />
          </div>
        </div>

        {positions.length > 0 ? (
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
                  <Link to="/positions/$slug" params={{ slug: pos.slug }}>
                    {pos.name}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {round.description ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {round.description}
            </p>
          </div>
        ) : null}

        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">ID:</span>{" "}
            <span className="font-mono">{round.id}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Questions</h2>
            {questions.length > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {questions.length}
              </Badge>
            ) : null}
          </div>
          <Button variant="default" size="sm" asChild>
            <Link to="/rounds/$id/add-question" params={{ id }}>
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
              <Link to="/rounds/$id/add-question" params={{ id }}>
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
                        <Link
                          to="/questions/$id"
                          params={{ id: question.id }}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="secondary" size="sm" asChild>
                        <Link
                          to="/questions/$id/edit"
                          params={{ id: question.id }}
                        >
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
    </div>
  );
}
