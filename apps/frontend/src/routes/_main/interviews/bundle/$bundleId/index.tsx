import {
  buildNamedEntityFolderPath,
  formatPersonName,
} from "@workspace/nextcloud/paths";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DetailPageSkeleton } from "~/components/route-skeletons/detail-page-skeleton";
import {
  loadInterviewBundleById,
  type InterviewBundleDetailData,
  type InterviewResponse,
} from "~/lib/loaders/interviews";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Bot,
  Check,
  Copy,
  Mic,
  ClipboardList,
  ExternalLink,
  Monitor,
} from "lucide-react";
import { formatDate } from "~/lib/utils";
import ApplicationBreadcrumb from "~/components/application-breadcrumb";
import { useState } from "react";
import { getOptionLabel } from "~/lib/question-options";
import type { QuestionOption } from "@workspace/db/question-types";

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

function formatResponseAnswer(response: InterviewResponse): string {
  if (response.transcript?.trim()) return response.transcript;
  if (response.question?.questionType === "mcq") {
    return (
      getOptionLabel(
        response.question.options as QuestionOption[],
        response.selectedOptionId,
      ) ??
      response.selectedOptionId ??
      "No answer"
    );
  }
  return response.answerText || "No answer";
}

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
            {candidate && (
              <p className="text-lg text-muted-foreground">
                {candidate.firstName} {candidate.lastName}
                {positionName ? ` · ${positionName}` : ""}
              </p>
            )}
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

      <Tabs defaultValue={roundDetails[0]?.round.round.id ?? "0"}>
        <TabsList className="flex-wrap h-auto">
          {roundDetails.map(({ round }) => (
            <TabsTrigger key={round.round.id} value={round.round.id}>
              {round.round.name}
              {round.bundleRound.status === "completed" ? " ✓" : ""}
            </TabsTrigger>
          ))}
        </TabsList>

        {roundDetails.map(({ round, responses, evaluation }) => {
          const session = round.session;
          const recordingUrl = session.sessionAudioUrl;
          const recordingPath =
            session.sessionAudioPath ??
            `${buildNamedEntityFolderPath({
              root: "/ATS/interviews",
              name: candidate
                ? formatPersonName(candidate.firstName, candidate.lastName)
                : null,
              id: session.id,
            })}/screen-recording.webm`;

          return (
            <TabsContent
              key={round.round.id}
              value={round.round.id}
              className="space-y-4 mt-4"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {round.bundleRound.deliveryMode === "voice" ? (
                    <Mic className="h-3 w-3 mr-1" />
                  ) : (
                    <ClipboardList className="h-3 w-3 mr-1" />
                  )}
                  {round.bundleRound.deliveryMode}
                </Badge>
                <Badge variant="secondary">{round.bundleRound.status}</Badge>
                <Badge variant="secondary">{session.status}</Badge>
              </div>

              {recordingUrl && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Screen Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="secondary" size="sm" asChild>
                      <a href={recordingUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Recording
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Path: {recordingPath}
                    </p>
                  </CardContent>
                </Card>
              )}

              {session.cheatingSummary && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Anti-cheat Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                      {JSON.stringify(session.cheatingSummary, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Responses ({responses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {responses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No responses recorded yet.
                    </p>
                  ) : (
                    responses.map((response) => (
                      <div key={response.id} className="border-b pb-4 last:border-0">
                        <p className="text-sm font-medium mb-1">
                          {response.question?.questionText}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatResponseAnswer(response)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {evaluation && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">AI Evaluation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {evaluation.summary && (
                      <p className="text-sm">{evaluation.summary}</p>
                    )}
                    {evaluation.score != null && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Score: {evaluation.score}/10
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
