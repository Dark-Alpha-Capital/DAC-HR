import React, { Suspense } from "react";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import {
  getApplicationWithInterviews,
  getInterviewById,
} from "@workspace/db/repositories/interview-repository";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import Link from "next/link";
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
import { formatDate } from "@/lib/utils";
import InterviewQuestionFeedbackDisplay from "@/components/interview-question-feedback-display";
import InterviewSummaryForm from "@/components/interview-summary-form";
import InterviewAiAnalysisTab from "@/components/interview-ai-analysis-tab";
import InterviewScreeningsTab from "@/components/interview-screenings-tab";
import ApplicationBreadcrumb from "@/components/application-breadcrumb";
import { UserAuthenticated } from "@/components/auth-checks";
import { cacheLife, cacheTag } from "next/cache";

type Params = Promise<{ id: string }>;

const InterviewPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <Suspense fallback={<InterviewLoadingSkeleton />}>
        <DisplayInterviewWrapper params={params} />
      </Suspense>
    </div>
  );
};

export default InterviewPage;

async function CachedInterviewById(interviewId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`interview-${interviewId}`);
  return await getInterviewById(interviewId);
}

async function CachedApplicationWithInterviews(applicationId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`application-${applicationId}`);
  return await getApplicationWithInterviews(applicationId);
}

async function CachedCandidateById(candidateId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");
  cacheTag(`candidate-${candidateId}`);
  return await getCandidateById(candidateId);
}

const DisplayInterviewWrapper = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const interview = await CachedInterviewById(id);

  if (!interview) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-medium">Interview not found</h1>
        <p className="text-muted-foreground mt-2">
          This interview doesn't exist or has been removed.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/applications">View Applications</Link>
        </Button>
      </div>
    );
  }

  const application = await CachedApplicationWithInterviews(
    interview.applicationId,
  );
  const candidate = application
    ? await CachedCandidateById(application.candidateId)
    : null;

  return (
    <DisplayInterview
      interview={interview}
      application={application}
      candidate={candidate}
    />
  );
};

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

function DisplayInterview({
  interview,
  application,
  candidate,
}: {
  interview: NonNullable<Awaited<ReturnType<typeof getInterviewById>>>;
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>> | null;
  candidate: Awaited<ReturnType<typeof getCandidateById>> | null;
}) {
  const config = statusConfig[interview.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const questions = interview.questions || [];
  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : undefined;
  const positionName = application?.position?.name;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <ApplicationBreadcrumb
        candidateName={candidateName}
        positionName={positionName}
        interviewRoundName={interview.roundTemplate.name}
        applicationId={application?.id}
        interviewId={interview.id}
      />

      {/* Header */}
      <header className="space-y-6 pb-6 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 flex-1">
            {/* Round Name */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {interview.roundTemplate.name}
              </h1>
              {candidate && (
                <div className="flex items-center gap-4">
                  <p className="text-lg text-muted-foreground">
                    {candidate.firstName} {candidate.lastName}
                  </p>
                  {application?.position && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-lg text-muted-foreground">
                        {application.position.name}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {interview.scheduledAt && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(interview.scheduledAt)}
                </span>
              )}
              {interview.interviewer && (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {interview.interviewer.name || interview.interviewer.email}
                </span>
              )}
            </div>
          </div>

          {/* Status and Rating */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {interview.rating && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0"
                >
                  <Star className="h-3 w-3 fill-current mr-1" />
                  {interview.rating}/5
                </Badge>
              )}
              <Badge variant={config.variant} className={config.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="questions" className="w-full">
        <TabsList>
          <TabsTrigger value="questions" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Questions
            {questions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {questions.length}
              </Badge>
            )}
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

const InterviewLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        <div className="h-8 w-28 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-4 pb-6 border-b">
        <div className="h-7 w-64 bg-muted animate-pulse rounded" />
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-10 w-48 bg-muted animate-pulse rounded" />
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
};
