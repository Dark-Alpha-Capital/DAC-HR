import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import BackButton from "#/components/shared/back-button";
import { Pencil, Calendar, Clock, Briefcase } from "lucide-react";
import DeleteRoundButton from "#/components/shared/delete-round-button";
import { RoundDetailQuestions } from "#/features/rounds/components/round-detail-questions";
import { formatDate } from "#/lib/utils";
import { Badge } from "#/components/ui/badge";

export function RoundDetailPage() {
  const { round, positions, questions } = useLoaderData({
    from: "/_main/rounds/$id/",
  });

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
          <Link to="/rounds" search={{} as never}>
            Back to Rounds
          </Link>
        </Button>
      </div>
    );
  }

  const position = positions[0];
  const positionId = round.positionId ?? position?.id ?? "";
  const positionName = position?.name ?? "this position";

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
              new Date(round.updatedAt).getTime() !==
                new Date(round.createdAt).getTime() ? (
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

      <RoundDetailQuestions
        roundId={round.id}
        roundName={round.name}
        positionId={positionId}
        positionName={positionName}
        questions={questions}
      />
    </div>
  );
}
