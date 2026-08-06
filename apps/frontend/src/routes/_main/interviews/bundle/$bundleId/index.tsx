import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DetailPageSkeleton } from "~/components/route-skeletons/detail-page-skeleton";
import type { InterviewBundleDetailData } from "~/lib/loaders/interviews";
import {
  interviewBundleDetailQueryOptions,
  interviewBundleScreeningsQueryOptions,
  screenersListQueryOptions,
} from "~/lib/query/interview-queries";
import { queryKeys } from "~/lib/query/query-keys";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Bot, Check, Copy, History, Sparkles } from "lucide-react";
import { formatDate } from "~/lib/utils";
import ApplicationBreadcrumb from "~/components/application-breadcrumb";
import { BundleRoundStepper } from "~/components/bundle-round-stepper";
import { BundleRoundPanel } from "~/components/bundle-round-panel";
import InterviewAiAnalysisTab from "~/components/interview-ai-analysis-tab";
import InterviewScreeningsTab from "~/components/interview-screenings-tab";
import { useState } from "react";

type BundleDetailTab = "rounds" | "ai-analysis" | "screenings";

interface BundleDetailSearch {
  tab?: BundleDetailTab;
  round?: number;
}

function parseBundleDetailSearch(
  search: Record<string, unknown>,
): BundleDetailSearch {
  const tab =
    search.tab === "ai-analysis" || search.tab === "screenings"
      ? search.tab
      : undefined;
  const rawRound = Number(search.round);
  return {
    tab,
    round:
      search.round !== undefined && Number.isFinite(rawRound)
        ? rawRound
        : undefined,
  };
}

export const Route = createFileRoute("/_main/interviews/bundle/$bundleId/")({
  head: () => ({
    meta: [{ title: "Position Interview" }],
  }),
  validateSearch: parseBundleDetailSearch,
  loader: async ({ context: { queryClient }, params }) => {
    const detail = await queryClient.ensureQueryData(
      interviewBundleDetailQueryOptions(params.bundleId),
    );
    await Promise.all([
      queryClient.ensureQueryData(screenersListQueryOptions()),
      queryClient.ensureQueryData(
        interviewBundleScreeningsQueryOptions(params.bundleId),
      ),
    ]);
    return (detail as InterviewBundleDetailData | null) ?? null;
  },
  component: InterviewBundleDetailPage,
  pendingComponent: () => (
    <DetailPageSkeleton container tabs showBreadcrumb showActions />
  ),
});

function BundleStatusBadge({ status }: { status: string }) {
  if (status === "expired") {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
        Expired
      </Badge>
    );
  }
  if (status === "completed" || status === "reviewed") {
    return (
      <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0">
        <Check className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
        In Progress
      </Badge>
    );
  }
  return <Badge variant="secondary">Pending</Badge>;
}

function InterviewBundleDetailPage() {
  const { bundleId } = Route.useParams();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery(
    interviewBundleDetailQueryOptions(bundleId),
  );
  const { data: screenersData } = useQuery(screenersListQueryOptions());

  if (isLoading && !data) {
    return <DetailPageSkeleton container tabs showBreadcrumb showActions />;
  }

  if (!data?.bundle) {
    return (
      <div className="container mx-auto py-6 max-w-4xl text-center">
        <h1 className="text-xl font-medium">Interview not found</h1>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/applications" search={{} as any}>
            View Applications
          </Link>
        </Button>
      </div>
    );
  }

  const { bundle, application, candidate, roundDetails } =
    data as InterviewBundleDetailData;
  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : undefined;
  const positionName = application?.position?.name;
  const interviewLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/interview/${bundle.token}`
      : `/interview/${bundle.token}`;

  const completedRounds = roundDetails.filter(
    (r) => r.round.bundleRound.status === "completed",
  ).length;
  const progressPct =
    roundDetails.length > 0
      ? Math.round((completedRounds / roundDetails.length) * 100)
      : 0;
  const isExpired = new Date(bundle.expiresAt) < new Date();

  const activeTab = search.tab ?? "rounds";
  const defaultRoundIndex = Math.max(
    0,
    roundDetails.findIndex((r) => r.round.bundleRound.status !== "pending"),
  );
  const activeRoundIndex =
    roundDetails.length === 0
      ? 0
      : Math.min(
          Math.max(search.round ?? defaultRoundIndex, 0),
          roundDetails.length - 1,
        );

  const screeners =
    screenersData?.screeners.map((screener: { id: string; name: string }) => ({
      id: screener.id,
      name: screener.name,
    })) ?? [];

  const positionScreener =
    screenersData?.screeners.find(
      (screener: { positionId?: string | null }) =>
        screener.positionId === application?.position?.id,
    ) ?? null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(interviewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleTabChange = (tab: string) => {
    void navigate({
      search: (current) => ({ ...current, tab: tab as BundleDetailTab }),
    });
  };

  const handleRoundSelect = (round: number) => {
    void navigate({
      search: (current) => ({ ...current, round }),
    });
  };

  const handleAnalysisComplete = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.interviews.bundleScreenings(bundleId),
    });
  };

  const bundleStatus = isExpired ? "expired" : bundle.status;
  const initials = candidate
    ? `${candidate.firstName?.[0] ?? ""}${candidate.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <ApplicationBreadcrumb
        candidateId={candidate?.id}
        candidateName={candidateName}
        positionName={positionName}
        interviewRoundName="Position Interview"
        applicationId={application?.id}
      />

      <header className="space-y-5 pb-6 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Position Interview
              </h1>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                <Bot className="h-3 w-3 mr-1" />
                AI Bundle
              </Badge>
              <BundleStatusBadge status={bundleStatus} />
            </div>
            {candidate ? (
              <div className="flex items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <p className="text-lg text-muted-foreground">
                  {candidate.firstName} {candidate.lastName}
                  {positionName ? ` · ${positionName}` : ""}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="max-w-md space-y-1.5">
          <Progress value={progressPct} className="h-1" />
          <p className="text-sm text-muted-foreground">
            {completedRounds} of {roundDetails.length} rounds complete
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            {isExpired ? "Expired" : `Expires ${formatDate(bundle.expiresAt)}`}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm break-all">
            {interviewLink}
          </code>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copy Link
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="rounds">Rounds</TabsTrigger>
          <TabsTrigger value="ai-analysis" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="screenings" className="gap-2">
            <History className="h-4 w-4" />
            Screenings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rounds" className="mt-4 space-y-5">
          {roundDetails.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No rounds configured for this position interview.
            </div>
          ) : (
            <>
              <BundleRoundStepper
                rounds={roundDetails}
                activeIndex={activeRoundIndex}
                onSelect={handleRoundSelect}
              />
              <BundleRoundPanel
                key={roundDetails[activeRoundIndex].round.round.id}
                roundDetail={roundDetails[activeRoundIndex]}
                candidate={candidate}
                index={activeRoundIndex}
                totalRounds={roundDetails.length}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="ai-analysis" className="mt-4">
          <InterviewAiAnalysisTab
            bundleId={bundle.id}
            screeners={screeners}
            defaultScreenerId={positionScreener?.id ?? undefined}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </TabsContent>

        <TabsContent value="screenings" className="mt-4">
          <InterviewScreeningsTab bundleId={bundle.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
