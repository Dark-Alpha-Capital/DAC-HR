import React, { Suspense } from "react";
import {
  getApplicationWithInterviews,
  getCandidateById,
  getInterviewById,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
  User,
  Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import InterviewQuestionFeedbackDisplay from "@/components/interview-question-feedback-display";
import InterviewSummaryDisplay from "@/components/interview-summary-display";

type Params = Promise<{ id: string }>;

const InterviewPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space-mini container mx-auto">
      <BackButton />
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
      <Card>
        <CardHeader>
          <CardTitle>Interview not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The interview you're looking for doesn't exist or has been removed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const application = await getApplicationWithInterviews(
    interview.applicationId
  );
  const candidate = application
    ? await getCandidateById(application.candidateId)
    : null;

  const interviewStatusColors: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    pending: "outline",
    move_forward: "default",
    rejected: "destructive",
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-2xl font-bold">
                  {interview.roundTemplate.name}
                </CardTitle>
                <Badge
                  variant={interviewStatusColors[interview.status] || "outline"}
                >
                  {interview.status === "move_forward"
                    ? "Move Forward"
                    : interview.status.charAt(0).toUpperCase() +
                      interview.status.slice(1)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {interview.rating && (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Rating:{" "}
                    {interview.rating}/5
                  </span>
                )}
                {interview.scheduledAt && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Interview Date: {formatDate(interview.scheduledAt)}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Created {formatDate(interview.createdAt)}
                </span>
                {interview.interviewer && (
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Interviewer{" "}
                    {interview.interviewer.name || interview.interviewer.email}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {candidate && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Users className="h-4 w-4 mr-2" />
                      {candidate.firstName} {candidate.lastName}
                    </Link>
                  </Button>
                )}
                {application && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/applications/${application.id}`}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      View Application
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            {application && (
              <div className="flex flex-col gap-2 text-sm">
                <p className="font-medium text-muted-foreground">Position</p>
                <div className="rounded-md border px-3 py-2 shadow-sm">
                  <p className="font-semibold text-foreground">
                    {application.position.name}
                  </p>
                  {application.position.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {application.position.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Round Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Round Feedback</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <InterviewSummaryDisplay
            interview={interview}
            applicationId={application?.id ?? interview.applicationId}
          />
        </CardContent>
      </Card>
    </div>
  );
};

const InterviewLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-8 w-60 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
