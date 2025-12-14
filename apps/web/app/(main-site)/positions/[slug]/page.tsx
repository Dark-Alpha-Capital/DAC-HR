import React, { Suspense } from "react";
import {
  getPositionBySlug,
  getRoundsByPositionId,
  getCandidatesByPositionId,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { Pencil, Calendar, Clock, Eye, Users, User } from "lucide-react";
import DeletePositionButton from "@/components/delete-position-button";
import { formatDate } from "@/lib/utils";
import { UserIsAdmin } from "@/components/auth-checks";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cacheLife, cacheTag } from "next/cache";

type Params = Promise<{ slug: string }>;

const PositionPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Position details
          </h1>
          <p className="text-sm text-muted-foreground">
            Review the position, associated rounds and candidates in a clear,
            linear layout.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/positions">Back to positions</Link>
        </Button>
      </div>

      <Separator />

      <div className="space-y-10">
        <section>
          <Suspense fallback={<PositionLoadingSkeleton />}>
            <DisplayPositionWrapper params={params} />
          </Suspense>
        </section>

        <section>
          <Suspense fallback={<RoundsLoadingSkeleton />}>
            <RoundsSectionWrapper params={params} />
          </Suspense>
        </section>

        <section>
          <Suspense fallback={<CandidatesLoadingSkeleton />}>
            <CandidatesSectionWrapper params={params} />
          </Suspense>
        </section>
      </div>
    </div>
  );
};

export default PositionPage;

const PositionLoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="h-7 w-64 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
};

// Cached function for position by slug
async function CachedPositionBySlug(slug: string) {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  return await getPositionBySlug(slug);
}

// Cached function for rounds by position ID
async function CachedRoundsByPositionId(positionId: string) {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  return await getRoundsByPositionId(positionId);
}

// Cached function for candidates by position ID
async function CachedCandidatesByPositionId(positionId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("positions");
  cacheTag("candidates");

  return await getCandidatesByPositionId(positionId);
}

// Component (not cached) reads runtime data
const DisplayPositionWrapper = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const position = await CachedPositionBySlug(slug);

  if (!position) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Position not found</h2>
        <p className="text-sm text-muted-foreground">
          The position you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link href="/positions">Back to positions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {position.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {position.status && (
                <Badge
                  variant="outline"
                  className={`text-[0.7rem] ${
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
              )}
              {position.hireLevel && (
                <Badge variant="secondary" className="text-[0.7rem]">
                  {position.hireLevel === "managing-director" &&
                    "Managing Director"}
                  {position.hireLevel === "vice-president" && "Vice President"}
                  {position.hireLevel === "associate-analyst" &&
                    "Associate Analyst"}
                  {position.hireLevel === "intern" && "Intern"}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1.5 text-[0.7rem]">
                <Calendar className="h-3 w-3" />
                Created {formatDate(position.createdAt)}
              </Badge>
              {position.updatedAt &&
                position.updatedAt.getTime() !==
                  position.createdAt.getTime() && (
                  <Badge variant="outline" className="gap-1.5 text-[0.7rem]">
                    <Clock className="h-3 w-3" />
                    Updated {formatDate(position.updatedAt)}
                  </Badge>
                )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/positions/${position.slug}/edit`}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
            <DeletePositionButton positionId={position.id} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Slug:</span> {position.slug}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Description</h3>
        {position.description ? (
          <div
            dangerouslySetInnerHTML={{ __html: position.description }}
            className="prose prose-sm max-w-none dark:prose-invert"
          />
        ) : null}
      </div>
    </div>
  );
};
const RoundsSectionWrapper = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const position = await CachedPositionBySlug(slug);

  if (!position) {
    return null;
  }

  const rounds = await CachedRoundsByPositionId(position.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Associated rounds</h2>
        <Badge variant="secondary" className="text-[0.7rem]">
          {rounds.length}
        </Badge>
      </div>
      {rounds.length === 0 ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            No rounds are currently linked to this position.
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/rounds/new?position=${position.id}`}>
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
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/rounds/${round.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Link>
                </Button>
              </div>
              {index !== rounds.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Candidates Section Component
const CandidatesSectionWrapper = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const position = await CachedPositionBySlug(slug);

  if (!position) {
    return null;
  }

  const candidates = await CachedCandidatesByPositionId(position.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Candidates</h2>
        </div>
        <Badge variant="secondary" className="text-[0.7rem]">
          {candidates.length}
        </Badge>
      </div>

      {candidates.length === 0 ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            No candidates have applied for this position yet.
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/candidates/new?position=${position.id}`}>
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
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/candidates/${candidateData.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Link>
                </Button>
              </div>
              {index !== candidates.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Loading Skeletons
const RoundsLoadingSkeleton = () => {
  return (
    <div className="space-y-3">
      <div className="h-5 w-40 bg-muted animate-pulse rounded" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
            {i === 1 && <Separator className="my-2" />}
          </div>
        ))}
      </div>
    </div>
  );
};

const CandidatesLoadingSkeleton = () => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-5 w-8 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 bg-muted animate-pulse rounded" />
            {i !== 3 && <Separator className="my-2" />}
          </div>
        ))}
      </div>
    </div>
  );
};
