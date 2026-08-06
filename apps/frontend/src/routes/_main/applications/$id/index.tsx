import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { DetailPageSkeleton } from "~/components/route-skeletons/detail-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  loadApplicationDetail,
  type ApplicationDetailData,
} from "~/lib/loaders/candidates";
import { queryKeys } from "~/lib/query/query-keys";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Briefcase, Calendar, MessageSquare, Star } from "lucide-react";
import { formatDate } from "~/lib/utils";
import InlineApplicationStatusEditor from "~/components/inline-application-status-editor";
import ApplicationPersonalitySelector from "~/components/application-personality-selector";
import ApplicationProgressTimeline from "~/components/application-progress-timeline";
import ApplicationBreadcrumb from "~/components/application-breadcrumb";

function applicationDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.applications.detail(id),
    queryFn: async (): Promise<ApplicationDetailData> =>
      (await loadApplicationDetail({ data: id })) as ApplicationDetailData,
  });
}

export const Route = createFileRoute("/_main/applications/$id/")({
  head: () => ({
    meta: [{ title: "Application Detail" }],
  }),
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(applicationDetailQueryOptions(params.id));
  },
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const { session } = Route.useRouteContext();
  const { data, isLoading }: UseQueryResult<ApplicationDetailData> = useQuery(
    applicationDetailQueryOptions(id),
  );

  if (isLoading && !data) {
    return <DetailPageSkeleton container tabs showBreadcrumb showActions />;
  }

  if (!data) {
    return null;
  }

  const { application, candidate, sessions, aiScreenings, users } = data;
  const currentUser = session.user;

  if (!application) {
    return (
      <div className="container mx-auto py-6 max-w-4xl text-center">
        <h1 className="text-xl font-medium">Application not found</h1>
        <p className="text-muted-foreground mt-2">
          This application doesn&apos;t exist or has been removed.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/applications" search={{} as any}>
            View All Applications
          </Link>
        </Button>
      </div>
    );
  }

  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : "Unknown Candidate";
  const positionName =
    (application as any).position?.name ?? "Unknown Position";

  const rounds = (application as any).rounds ?? [];
  const interviews = (application as any).interviews ?? [];
  const bundles = (application as any).bundles ?? [];

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <ApplicationBreadcrumb
        candidateId={candidate?.id}
        candidateName={candidateName}
        positionName={positionName}
        applicationId={application.id}
      />

      <header className="space-y-6 pb-6 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {positionName}
              </h1>
              <p className="text-lg text-muted-foreground">{candidateName}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Applied {formatDate(application.createdAt)}
              </span>
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {interviews.length} interview
                {interviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <InlineApplicationStatusEditor
              application={{ id: application.id, status: application.status }}
              candidateId={application.candidateId}
            />
            <ApplicationPersonalitySelector
              applicationId={application.id}
              currentPersonality={application.personality}
            />
          </div>
        </div>
      </header>

      <Tabs defaultValue="interviews" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Interviews
            {interviews.length > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {interviews.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
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
                  <span className="text-muted-foreground">Personality</span>
                  <ApplicationPersonalitySelector
                    applicationId={application.id}
                    currentPersonality={application.personality}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied</span>
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

          {aiScreenings.length > 0 && (
            <div className="mt-6 space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                AI Screenings
              </h3>
              <div className="space-y-2">
                {aiScreenings.map((screening) => (
                  <div
                    key={screening.id}
                    className="text-sm flex items-center gap-2"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span className="text-muted-foreground">
                      {formatDate(screening.createdAt)} —{" "}
                      {typeof screening.structuredData === "object" &&
                      screening.structuredData
                        ? ((screening.structuredData as any).score ?? "N/A")
                        : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="interviews" className="mt-6">
          <ApplicationProgressTimeline
            rounds={rounds}
            interviews={interviews}
            bundles={bundles}
            applicationId={application.id}
            currentUser={currentUser}
            users={users}
            application={application as any}
            positionSlug={(application as any).position?.slug as
              | string
              | undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
