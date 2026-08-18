import { Link, useLoaderData } from "@tanstack/react-router";
import type { InterviewResponse } from "#/features/interviews/types";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "#/components/ui/tabs";
import {
  Calendar,
  User,
  Star,
  CheckCircle,
  Circle,
  XCircle,
  Clock,
  MessageSquare,
  FileText,
  Sparkles,
  History,
  Copy,
  Check,
  Bot,
  Mic,
  Monitor,
} from "lucide-react";
import { formatDate } from "#/lib/utils";
import InterviewQuestionFeedbackDisplay from "#/features/interviews/components/interview-question-feedback-display";
import InterviewSummaryForm from "#/features/interviews/components/interview-summary-form";
import InterviewAiAnalysisTab from "#/features/interviews/components/interview-ai-analysis-tab";
import InterviewScreeningsTab from "#/features/interviews/components/interview-screenings-tab";
import { InterviewSessionRecording } from "#/features/interviews/components/interview-session-recording";
import ApplicationBreadcrumb from "#/components/shared/application-breadcrumb";
import { useState } from "react";
import { getOptionLabel } from "#/features/questions/helpers";
import type { QuestionOption } from "#/lib/question-types";

// SAFETY: the applications route's validateSearch fills in defaults for all
// search params, so an empty search object is a valid navigation target;
// `never` only satisfies tanstack's required-search typing.
const emptyApplicationsSearch = {} as never;

const statusConfig = {
  move_forward: {
    label: "Move Forward",
    variant: "default" as const,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0",
    icon: XCircle,
  },
  scheduled: {
    label: "Scheduled",
    variant: "secondary" as const,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0",
    icon: Clock,
  },
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    className: "bg-muted text-muted-foreground border-0",
    icon: Circle,
  },
  completed: {
    label: "Completed",
    variant: "secondary" as const,
    className:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0",
    icon: CheckCircle,
  },
};

function formatResponseAnswer(response: InterviewResponse): string {
  if (response.transcript?.trim()) {
    return response.transcript;
  }

  if (response.question?.questionType === "mcq") {
    return (
      getOptionLabel(
        // SAFETY: mcq questions always carry their QuestionOption[] options
        // (the `options` column is populated for mcq question types).
        response.question.options as QuestionOption[],
        response.selectedOptionId,
      ) ??
      response.selectedOptionId ??
      "No answer"
    );
  }
  return response.answerText || "No answer";
}

/** Returns the page origin on the client, or "" during server rendering. */
function getClientOrigin(): string {
  try {
    return window.location.origin;
  } catch {
    return "";
  }
}

export function InterviewDetailPage() {
  const { interview, application, candidate, session, responses } =
    useLoaderData({ from: "/_main/interviews/$id/" });
  const [copied, setCopied] = useState(false);

  if (!interview) {
    return (
      <div className="container mx-auto py-6 max-w-4xl text-center">
        <h1 className="text-xl font-medium">Interview not found</h1>
        <p className="text-muted-foreground mt-2">
          This interview doesn&apos;t exist or has been removed.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/applications" search={emptyApplicationsSearch}>
            View Applications
          </Link>
        </Button>
      </div>
    );
  }

  const isAiSessionResolved = interview.mode === "ai_session";

  const config =
    // SAFETY: interview.status is one of the interviewStatuses values, which
    // map exactly onto the statusConfig keys; fallback covers unknown values.
    statusConfig[interview.status as keyof typeof statusConfig] ||
    statusConfig.pending;
  const StatusIcon = config.icon;
  const questions = interview.questions ?? [];
  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : undefined;
  const positionName = application?.position?.name;

  const interviewLink = session?.session?.token
    ? `${getClientOrigin()}/interview/${session.session.token}`
    : "";
  const hasSessionRecording = Boolean(
    session?.session?.sessionAudioUrl || session?.session?.sessionAudioPath,
  );

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <ApplicationBreadcrumb
        candidateId={candidate?.id}
        candidateName={candidateName}
        positionName={positionName}
        interviewRoundName={interview.roundTemplate.name}
        applicationId={application?.id}
        interviewId={interview.id}
      />

      <header className="space-y-6 pb-6 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {interview.roundTemplate.name}
                </h1>
                {isAiSessionResolved ? (
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0"
                  >
                    <Bot className="h-3 w-3 mr-1" />
                    AI Session
                  </Badge>
                ) : null}
              </div>
              {candidate ? (
                <div className="flex items-center gap-4">
                  <p className="text-lg text-muted-foreground">
                    {candidate.firstName} {candidate.lastName}
                  </p>
                  {application?.position ? (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-lg text-muted-foreground">
                        {application.position.name}
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {interview.scheduledAt ? (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(interview.scheduledAt)}
                </span>
              ) : null}
              {interview.interviewer ? (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {interview.interviewer.name || interview.interviewer.email}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {interview.rating ? (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0"
                >
                  <Star className="h-3 w-3 fill-current mr-1" />
                  {interview.rating}/5
                </Badge>
              ) : null}
              <Badge variant={config.variant} className={config.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <Tabs
        defaultValue={isAiSessionResolved ? "session" : "overview"}
        className="w-full"
      >
        <TabsList>
          {isAiSessionResolved ? (
            <>
              <TabsTrigger value="session" className="gap-2">
                <Bot className="h-4 w-4" />
                Session
              </TabsTrigger>
              <TabsTrigger value="responses" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Responses
                {responses.length > 0 ? (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-xs"
                  >
                    {responses.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="overview" className="gap-2">
                <FileText className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Questions
                {questions.length > 0 ? (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 px-1.5 text-xs"
                  >
                    {questions.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="ai-analysis" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="screenings" className="gap-2">
            <History className="h-4 w-4" />
            Screenings
          </TabsTrigger>
        </TabsList>

        {isAiSessionResolved ? (
          <>
            <TabsContent value="session" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Session Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-3.5" />
                      Created:{" "}
                      {formatDate(
                        session?.session?.createdAt ?? interview.createdAt,
                      )}
                    </div>
                    {session?.session?.startedAt ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="size-3.5" />
                        Started: {formatDate(session.session.startedAt)}
                      </div>
                    ) : null}
                    {session?.session?.completedAt ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="size-3.5" />
                        Completed: {formatDate(session.session.completedAt)}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-3.5" />
                      Expires:{" "}
                      {formatDate(session?.session?.expiresAt ?? new Date())}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      Tab switches: {session?.session?.tabSwitches ?? 0}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground capitalize">
                      Delivery mode:{" "}
                      {session?.session?.deliveryMode ?? "hybrid"}
                    </div>
                    {session?.session?.cheatingSummary ? (
                      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">
                          Cheating summary
                        </p>
                        <p>
                          Tab switches:{" "}
                          {session.session.cheatingSummary.tabSwitches ?? 0}
                        </p>
                        <p>
                          Focus lost (sec):{" "}
                          {session.session.cheatingSummary.focusLostSeconds ??
                            0}
                        </p>
                        <p>
                          Fullscreen exits:{" "}
                          {session.session.cheatingSummary.fullscreenExits ?? 0}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Interview Link</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                        {interviewLink || "No link available"}
                      </code>
                      {interviewLink ? (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(interviewLink);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="shrink-0"
                        >
                          {copied ? (
                            <Check className="size-3.5 text-green-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="size-4" />
                    Screen Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasSessionRecording && session?.session?.id ? (
                    <InterviewSessionRecording sessionId={session.session.id} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recording uploaded yet. Voice sessions save a full
                      screen recording with audio to Nextcloud when the
                      candidate ends the interview.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="responses" className="mt-6">
              {responses.length > 0 ? (
                <div className="space-y-3">
                  {responses.map((r) => (
                    <Card key={r.id}>
                      <CardHeader className="pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {r.question?.category || "General"}
                          </Badge>
                          {r.inputMethod ? (
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {r.inputMethod === "voice" ? (
                                <Mic className="h-3 w-3 mr-1" />
                              ) : null}
                              {r.inputMethod}
                            </Badge>
                          ) : null}
                          <CardTitle className="text-sm font-medium">
                            {r.question?.questionText ?? "Question"}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {formatResponseAnswer(r)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No responses yet.</p>
                </div>
              )}
            </TabsContent>
          </>
        ) : (
          <>
            <TabsContent value="overview" className="mt-6">
              <InterviewSummaryForm
                interview={{
                  id: interview.id,
                  // SAFETY: the summary form is only rendered for non-AI
                  // interviews whose status is one of these four values.
                  status: interview.status as
                    | "pending"
                    | "move_forward"
                    | "rejected"
                    | "scheduled",
                  rating: interview.rating,
                  scheduledAt: interview.scheduledAt,
                  overallFeedback: interview.overallFeedback,
                }}
                applicationId={application?.id ?? interview.applicationId}
              />
            </TabsContent>

            <TabsContent value="questions" className="mt-6">
              {questions.length > 0 ? (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <InterviewQuestionFeedbackDisplay
                      key={question.id}
                      interviewId={interview.id}
                      question={question}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No questions for this interview</p>
                </div>
              )}
            </TabsContent>
          </>
        )}

        <TabsContent value="ai-analysis" className="mt-6">
          <InterviewAiAnalysisTab interviewId={interview.id} />
        </TabsContent>

        <TabsContent value="screenings" className="mt-6">
          <InterviewScreeningsTab interviewId={interview.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
