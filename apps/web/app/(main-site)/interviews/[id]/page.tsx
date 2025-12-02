import React, { Suspense } from "react";
import {
  getApplicationWithInterviews,
  getCandidateById,
  getInterviewById,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Users,
  Star,
  MessageSquare,
  FileText,
  CheckCircle,
  Circle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import InterviewQuestionFeedbackDisplay from "@/components/interview-question-feedback-display";
import InterviewSummaryDisplay from "@/components/interview-summary-display";
import { cn } from "@workspace/ui/lib/utils";
import { UserAuthenticated } from "@/components/auth-checks";

type Params = Promise<{ id: string }>;

const InterviewPage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <Suspense fallback={<InterviewLoadingSkeleton />}>
        <DisplayInterview params={params} />
      </Suspense>
    </div>
  );
};

export default InterviewPage;

const DisplayInterview = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const interview = await getInterviewById(id);

  if (!interview) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Interview not found</h1>
        <p className="text-muted-foreground">
          The interview you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  const application = await getApplicationWithInterviews(
    interview.applicationId
  );
  const candidate = application
    ? await getCandidateById(application.candidateId)
    : null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "move_forward":
        return {
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
          borderColor: "border-emerald-200 dark:border-emerald-800",
          badgeVariant: "default" as const,
          badgeClass:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
          icon: CheckCircle,
        };
      case "rejected":
        return {
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          borderColor: "border-red-200 dark:border-red-800",
          badgeVariant: "destructive" as const,
          badgeClass:
            "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
          icon: XCircle,
        };
      case "scheduled":
        return {
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
          borderColor: "border-blue-200 dark:border-blue-800",
          badgeVariant: "secondary" as const,
          badgeClass:
            "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
          icon: Clock,
        };
      default:
        return {
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted-foreground/20",
          badgeVariant: "outline" as const,
          badgeClass:
            "bg-muted/50 text-muted-foreground border-muted-foreground/20",
          icon: Circle,
        };
    }
  };

  const statusConfig = getStatusConfig(interview.status);
  const StatusIcon = statusConfig.icon;
  const totalQuestions = interview.questions?.length || 0;
  const answeredQuestions =
    interview.questions?.filter(
      (q) => q.feedback && q.feedback.notes && q.feedback.notes.trim() !== ""
    ).length || 0;
  const progressPercentage =
    totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-6 pb-6 border-b">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2 pt-2">
              <BackButton />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {interview.roundTemplate.name}
              </h1>
              <Badge
                variant={statusConfig.badgeVariant}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 flex items-center gap-1.5",
                  statusConfig.badgeClass
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {interview.status === "move_forward"
                  ? "Move Forward"
                  : interview.status.charAt(0).toUpperCase() +
                    interview.status.slice(1)}
              </Badge>
              {interview.rating && (
                <Badge
                  variant="secondary"
                  className="text-xs font-medium px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1.5"
                >
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {interview.rating}/5
                </Badge>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {interview.scheduledAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Interview:</span>
                  <span className="font-medium">
                    {formatDate(interview.scheduledAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {formatDate(interview.createdAt)}
                </span>
              </div>
              <div>
                <Button variant="link" size="sm" asChild>
                  <Link href={`/candidates/${candidate?.id}`}>
                    View Candidate
                  </Link>
                </Button>
              </div>

              {interview.interviewer && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Interviewer:</span>
                  <span className="font-medium">
                    {interview.interviewer.name || interview.interviewer.email}
                  </span>
                </div>
              )}
              {totalQuestions > 0 && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="font-medium">
                    {answeredQuestions}/{totalQuestions}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
          </div>

          {/* Position Info */}
          {application && (
            <div className="lg:min-w-[240px]">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Position
                </p>
                <p className="font-semibold text-lg">
                  {application.position.name}
                </p>
                {application.position.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {application.position.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Questions Overview */}
        {totalQuestions > 0 && (
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Header + Inline Questions */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Question Progress</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {answeredQuestions} of {totalQuestions} questions answered
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm font-medium">
                    {progressPercentage}%
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        interview.status === "move_forward"
                          ? "bg-emerald-500"
                          : interview.status === "rejected"
                            ? "bg-red-500"
                            : "bg-primary"
                      )}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Inline editable questions */}
              <div className="space-y-4 pt-2">
                {interview.questions.map((question, index) => (
                  <InterviewQuestionFeedbackDisplay
                    key={question.id}
                    interviewId={interview.id}
                    question={question}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Round Summary */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Round Summary</h2>
                <p className="text-xs text-muted-foreground">
                  Overall interview feedback
                </p>
              </div>
              <div className="pt-2">
                <InterviewSummaryDisplay
                  interview={interview}
                  applicationId={application?.id ?? interview.applicationId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InterviewLoadingSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4 pb-6 border-b">
        <div className="h-8 w-60 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
};
