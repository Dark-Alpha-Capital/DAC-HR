import { createFileRoute, Link } from "@tanstack/react-router";
import { DetailPageSkeleton } from "~/components/route-skeletons/detail-page-skeleton";
import {
  loadInterviewBundleById,
  type InterviewBundleDetailData,
} from "~/lib/loaders/interviews";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Bot, Check, Copy, History, Sparkles } from "lucide-react";
import { formatDate } from "~/lib/utils";
import ApplicationBreadcrumb from "~/components/application-breadcrumb";
import { BundleRoundPanel } from "~/components/bundle-round-panel";
import InterviewAiAnalysisTab from "~/components/interview-ai-analysis-tab";
import InterviewScreeningsTab from "~/components/interview-screenings-tab";
import { useState } from "react";

export const Route = createFileRoute("/_main/interviews/bundle/$bundleId/")({
  head: () => ({
    meta: [{ title: "Position Interview" }],
  }),
  loader: async ({ params }) => {
    const result = await loadInterviewBundleById({ data: params.bundleId });
    return result as InterviewBundleDetailData | null;
  },
  component: InterviewBundleDetailPage,
  pendingComponent: () => (
    <DetailPageSkeleton container tabs showBreadcrumb showActions />
  ),
});

function InterviewBundleDetailPage() {
  const data = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

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

  const { bundle, application, candidate, roundDetails } = data;
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(interviewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <ApplicationBreadcrumb
        candidateId={candidate?.id}
        candidateName={candidateName}
        positionName={positionName}
        interviewRoundName="Position Interview"
        applicationId={application?.id}
      />

      <header className="space-y-4 pb-6 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Position Interview
              </h1>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                <Bot className="h-3 w-3 mr-1" />
                AI Bundle
              </Badge>
            </div>
            {candidate ? (
              <p className="text-lg text-muted-foreground">
                {candidate.firstName} {candidate.lastName}
                {positionName ? ` · ${positionName}` : ""}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {completedRounds}/{roundDetails.length} rounds complete · Expires{" "}
              {formatDate(bundle.expiresAt)}
            </p>
          </div>
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

      <Tabs defaultValue="rounds">
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

        <TabsContent value="rounds" className="mt-4">
          <Tabs defaultValue={roundDetails[0]?.round.round.id ?? "0"}>
            <TabsList className="flex-wrap h-auto">
              {roundDetails.map(({ round }) => (
                <TabsTrigger key={round.round.id} value={round.round.id}>
                  {round.round.name}
                  {round.bundleRound.status === "completed" ? " ✓" : ""}
                </TabsTrigger>
              ))}
            </TabsList>

            {roundDetails.map((roundDetail) => (
              <TabsContent
                key={roundDetail.round.round.id}
                value={roundDetail.round.round.id}
                className="mt-4"
              >
                <BundleRoundPanel
                  roundDetail={roundDetail}
                  candidate={candidate}
                />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="ai-analysis" className="mt-4">
          <InterviewAiAnalysisTab bundleId={bundle.id} />
        </TabsContent>

        <TabsContent value="screenings" className="mt-4">
          <InterviewScreeningsTab bundleId={bundle.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
