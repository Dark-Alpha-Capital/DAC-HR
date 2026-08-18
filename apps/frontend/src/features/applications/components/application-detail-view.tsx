import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import type { ApplicationDetailData } from "#/features/applications/types";
import { applicationDetailQueryOptions } from "#/features/applications/query-options";
import { Button } from "#/components/ui/button";
import { Calendar, Star } from "lucide-react";
import { formatDate } from "#/lib/utils";
import InlineApplicationStatusEditor from "#/features/applications/components/inline-application-status-editor";
import ApplicationProgressTimeline from "#/features/applications/components/application-progress-timeline";
import ApplicationBreadcrumb from "#/components/shared/application-breadcrumb";
import { cn } from "#/lib/utils";

interface ApplicationDetailViewProps {
  applicationId: string;
  layout?: "page" | "embedded";
}

export function ApplicationDetailView({
  applicationId,
  layout = "page",
}: ApplicationDetailViewProps) {
  const { session } = useRouteContext({ from: "/_main" });
  const { data, isLoading }: UseQueryResult<ApplicationDetailData> = useQuery(
    applicationDetailQueryOptions(applicationId),
  );

  if (isLoading && !data) {
    return (
      <DetailPageSkeleton
        container={layout === "page"}
        tabs
        showBreadcrumb={layout === "page"}
        showActions
      />
    );
  }

  if (!data) {
    return null;
  }

  const { application, candidate, sessions, aiScreenings, users } = data;
  const currentUser = session.user;

  if (!application) {
    return (
      <div
        className={cn(
          "text-center",
          layout === "page" && "container mx-auto py-6 max-w-4xl",
          layout === "embedded" && "px-6 py-8",
        )}
      >
        <h1 className="text-xl font-medium">Application not found</h1>
        <p className="text-muted-foreground mt-2">
          This application doesn&apos;t exist or has been removed.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link
            to="/applications"
            search={{
              name: undefined,
              email: undefined,
              position: undefined,
              status: undefined,
              page: undefined,
            }}
          >
            View All Applications
          </Link>
        </Button>
      </div>
    );
  }

  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : "Unknown Candidate";
  const positionName = application.position?.name ?? "Unknown Position";
  const rounds = application.rounds ?? [];
  const interviews = application.interviews ?? [];
  const bundles = application.bundles ?? [];

  return (
    <div
      className={cn(
        "space-y-6",
        layout === "page" && "container mx-auto py-6 max-w-4xl",
        layout === "embedded" && "flex min-h-0 flex-1 flex-col px-6 py-6",
      )}
    >
      {layout === "page" ? (
        <ApplicationBreadcrumb
          candidateId={candidate?.id}
          candidateName={candidateName}
          positionName={positionName}
          applicationId={application.id}
        />
      ) : null}

      <header
        className={cn(
          "border-b",
          layout === "page" && "space-y-6 pb-6",
          layout === "embedded" && "pb-5",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <h1
                className={cn(
                  "font-bold tracking-tight",
                  layout === "page" && "text-3xl",
                  layout === "embedded" && "text-2xl",
                )}
              >
                {positionName}
              </h1>
              <p
                className={cn(
                  "text-muted-foreground",
                  layout === "page" && "text-lg",
                  layout === "embedded" && "text-sm",
                )}
              >
                {candidateName}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Added {formatDate(application.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Application Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <InlineApplicationStatusEditor
                application={{
                  id: application.id,
                  status: application.status,
                }}
                candidateId={application.candidateId}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Added</span>
              <span>{formatDate(application.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Interview Progress
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Rounds</span>
              <span>{rounds.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interviews</span>
              <span>{interviews.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Sessions</span>
              <span>{sessions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {aiScreenings.length > 0 ? (
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            First Round (AI)
          </h3>
          <div className="space-y-2">
            {aiScreenings.map((screening) => (
              <div
                key={screening.id}
                className="text-sm flex items-center gap-2"
              >
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="text-muted-foreground">
                  {formatDate(screening.createdAt)} -{" "}
                  {screening.structuredData
                    ? (screening.structuredData.score ?? "N/A")
                    : "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        <p>
          This is where you create or record interviews for this
          candidate&apos;s application. You can either generate an interview
          link to send to the candidate so they can complete the interview
          process on their own, or you can record it manually by adding their
          responses yourself. Once the interview is done, use screeners to
          screen the candidate and evaluate whether they are the right fit for
          this position.
        </p>
      </div>
      <ApplicationProgressTimeline
        rounds={rounds}
        interviews={interviews}
        bundles={bundles}
        applicationId={application.id}
        currentUser={currentUser}
        users={users}
        application={application}
        positionSlug={application.position?.slug}
        candidateEmail={candidate?.email ?? null}
      />
    </div>
  );
}
