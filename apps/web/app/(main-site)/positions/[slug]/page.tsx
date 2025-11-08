import React, { Suspense } from "react";
import {
  getPositionBySlug,
  getRoundsByPositionId,
} from "@workspace/db/queries";
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
import { Pencil, Calendar, Clock, Eye } from "lucide-react";
import DeletePositionButton from "@/components/delete-position-button";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

const PositionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
      <Suspense fallback={<PositionLoadingSkeleton />}>
        <DisplayPosition params={params} />
      </Suspense>
    </div>
  );
};

export default PositionPage;

const PositionLoadingSkeleton = () => {
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

const DisplayPosition = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const position = await getPositionBySlug(slug);

  if (!position) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Position not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The position you're looking for doesn't exist or has been removed.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/positions">Back to Positions</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const rounds = await getRoundsByPositionId(position.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-3xl">{position.name}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(position.createdAt)}
                </Badge>
                {position.updatedAt &&
                  position.updatedAt.getTime() !==
                    position.createdAt.getTime() && (
                    <Badge variant="outline" className="gap-1.5">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(position.updatedAt)}
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
              {position.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {position.description}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  No description provided for this position.
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex items-center justify-between gap-4 pt-6">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Slug:</span> {position.slug}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/positions/${position.slug}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <DeletePositionButton positionId={position.id} />
          </div>
        </CardFooter>
      </Card>

      {/* Rounds Section */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Rounds</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {rounds.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No rounds are currently linked to this position.
              </p>
              <Button variant="outline" asChild>
                <Link href="/rounds/new">Create a Round</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rounds.map((round) => (
                <div
                  key={round.id}
                  className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{round.name}</h4>
                      <Badge variant="secondary">
                        Stage {round.stageOrder}
                      </Badge>
                    </div>
                    {round.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {round.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No description provided
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/rounds/${round.id}`}>
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
