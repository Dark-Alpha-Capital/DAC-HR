import { createFileRoute, Link } from "@tanstack/react-router";
import { loadInterviewById } from "~/lib/loaders/interviews";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "~/components/ui/tabs";
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
} from "lucide-react";
import { formatDate } from "~/lib/utils";
import InterviewQuestionFeedbackDisplay from "~/components/interview-question-feedback-display";
import InterviewSummaryForm from "~/components/interview-summary-form";
import InterviewAiAnalysisTab from "~/components/interview-ai-analysis-tab";
import InterviewScreeningsTab from "~/components/interview-screenings-tab";
import ApplicationBreadcrumb from "~/components/application-breadcrumb";

export const Route = createFileRoute("/_main/interviews/$id/")({
  head: () => ({
    meta: [{ title: "Interview Detail" }],
  }),
  loader: async ({ params }) => loadInterviewById({ data: params.id }),
  component: InterviewDetailPage,
});

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
};

function InterviewDetailPage() {
  const { interview, application, candidate } = Route.useLoaderData();

  if (!interview) {
    return (
      <div className="container mx-auto py-6 max-w-4xl text-center">
        <h1 className="text-xl font-medium">Interview not found</h1>
        <p className="text-muted-foreground mt-2">
          This interview doesn&apos;t exist or has been removed.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link to="/applications" search={{} as any}>View Applications</Link>
        </Button>
      </div>
    );
  }

  const config =
    statusConfig[interview.status as keyof typeof statusConfig] ||
    statusConfig.pending;
  const StatusIcon = config.icon;
  const questions = interview.questions || [];
  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : undefined;
  const positionName = application?.position?.name;

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <ApplicationBreadcrumb
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
              <h1 className="text-3xl font-bold tracking-tight">
                {interview.roundTemplate.name}
              </h1>
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

      <Tabs defaultValue="questions" className="w-full">
        <TabsList>
          <TabsTrigger value="questions" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Questions
            {questions.length > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {questions.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="screenings" className="gap-2">
            <History className="h-4 w-4" />
            Screenings
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="summary" className="mt-6">
          <InterviewSummaryForm
            interview={interview}
            applicationId={application?.id ?? interview.applicationId}
          />
        </TabsContent>

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
