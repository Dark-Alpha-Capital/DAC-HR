import { createFileRoute, Link } from "@tanstack/react-router";
import { loadPositionBySlug } from "~/lib/loaders/positions";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Pencil,
  Calendar,
  Clock,
  Eye,
  Users,
  User,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import DeletePositionButton from "~/components/delete-position-button";
import PositionTabsClient from "~/components/position-tabs-client";

function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export const Route = createFileRoute("/_main/positions/$slug/")({
  head: () => ({
    meta: [{ title: "Position Detail" }],
  }),
  loader: async ({ params }) => loadPositionBySlug({ data: params.slug }),
  component: PositionDetailPage,
});

function PositionDetailPage() {
  const { position, rounds, candidates } = Route.useLoaderData();

  if (!position) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <h1 className="text-2xl font-semibold">Position not found</h1>
        <p className="text-muted-foreground">
          The position you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button variant="secondary" asChild>
          <Link to="/positions" search={{} as any}>
            Back to positions
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl font-bold">{position.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {position.status ? (
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    position.status === "active"
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                      : position.status === "hold"
                        ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                        : position.status === "passed"
                          ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                          : position.status === "upcoming"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                            : ""
                  }`}
                >
                  {position.status === "active" && "Active"}
                  {position.status === "hold" && "Hold"}
                  {position.status === "passed" && "Passed"}
                  {position.status === "upcoming" && "Upcoming"}
                </Badge>
              ) : null}
              {position.hireLevel ? (
                <Badge variant="secondary" className="text-xs">
                  {position.hireLevel === "managing-director" &&
                    "Managing Director"}
                  {position.hireLevel === "vice-president" && "Vice President"}
                  {position.hireLevel === "associate" && "Associate"}
                  {position.hireLevel === "analyst" && "Analyst"}
                  {position.hireLevel === "intern" && "Intern"}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link to="/positions/$slug/edit" params={{ slug: position.slug }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Position
              </Link>
            </Button>
            <DeletePositionButton positionId={position.id} />
          </div>
        </div>

        <PositionTabsClient>
          <TabsList>
            <TabsTrigger value="overview">
              <Briefcase className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rounds">
              <ClipboardList className="h-4 w-4 mr-2" />
              Rounds
              {rounds.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 min-w-5 px-1.5 text-xs"
                >
                  {rounds.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="candidates">
              <Users className="h-4 w-4 mr-2" />
              Candidates
              {candidates.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 min-w-5 px-1.5 text-xs"
                >
                  {candidates.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-2">
                    Position Details
                  </h2>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Slug:</span> {position.slug}
                    </p>
                    {position.hireLevel ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Hire Level:</span>{" "}
                        {position.hireLevel === "managing-director" &&
                          "Managing Director"}
                        {position.hireLevel === "vice-president" &&
                          "Vice President"}
                        {position.hireLevel === "associate" && "Associate"}
                        {position.hireLevel === "analyst" && "Analyst"}
                        {position.hireLevel === "intern" && "Intern"}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  {position.description ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {htmlToPlainText(position.description)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No description provided.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rounds" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Associated Rounds</h2>
                <Badge variant="secondary">{rounds.length}</Badge>
              </div>
              {rounds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-4">
                    No rounds are currently linked to this position.
                  </p>
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/rounds/new" search={{ position: position.id }}>
                      Create a round
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {rounds.map((round, index) => (
                    <div key={round.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <h3 className="text-sm font-medium">{round.name}</h3>
                          {round.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {round.description}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              No description provided.
                            </p>
                          )}
                        </div>
                        <Button variant="secondary" size="sm" asChild>
                          <Link to="/rounds/$id" params={{ id: round.id }}>
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Link>
                        </Button>
                      </div>
                      {index !== rounds.length - 1 ? (
                        <Separator className="my-2" />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="candidates" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Candidates</h2>
                <Badge variant="secondary">{candidates.length}</Badge>
              </div>

              {candidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-4">
                    No candidates have applied for this position yet.
                  </p>
                  <Button size="sm" variant="secondary" asChild>
                    <Link
                      to="/candidates/new"
                      search={{ position: position.id }}
                    >
                      Add a candidate
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidateData, index) => (
                    <div key={candidateData.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <h3 className="text-sm font-medium">
                              {candidateData.firstName} {candidateData.lastName}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {candidateData.email}
                          </p>
                        </div>
                        <Button variant="secondary" size="sm" asChild>
                          <Link
                            to="/candidates/$uid"
                            params={{ uid: candidateData.id }}
                            search={{} as any}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Link>
                        </Button>
                      </div>
                      {index !== candidates.length - 1 ? (
                        <Separator className="my-2" />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </PositionTabsClient>
      </div>
    </div>
  );
}
