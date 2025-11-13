import React, { Suspense } from "react";
import { getApplicationWithInterviews, getUsers } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  Calendar,
  Clock,
  Briefcase,
  Users,
  CheckCircle2,
  Circle,
  XCircle,
  User,
  FileText,
  ArrowRight,
  ArrowLeft,
  Plus,
  Edit,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { auth } from "@/auth";
import { headers } from "next/headers";
import RecordInterviewDialog from "@/components/record-interview-dialog";
import InterviewDetailCard from "@/components/interview-detail-card";
import ApplicationProgressTimeline from "@/components/application-progress-timeline";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ action?: string; interview?: string }>;

const ApplicationPage = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  return (
    <div className="block-space-mini container mx-auto">
      <Button asChild>
        <Link href="/applications">Go Back</Link>
      </Button>

      <Suspense fallback={<ApplicationLoadingSkeleton />}>
        <DisplayApplication params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default ApplicationPage;

const DisplayApplication = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const { id } = await params;
  const { action, interview: interviewId } = await searchParams;
  const application = await getApplicationWithInterviews(id);
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const users = await getUsers();

  if (!application) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The application you're looking for doesn't exist or has been
            removed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const applicationStatusColors: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    pending: "outline",
    reviewed: "secondary",
    shortlisted: "default",
    interviewing: "default",
    hired: "default",
    rejected: "destructive",
    withdrawn: "outline",
  } as const;

  const interviewStatusColors: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    pending: "outline",
    complete: "default",
  } as const;

  const currentUser = session?.user;
  const showRecordDialog = action === "record";
  const selectedInterview = interviewId
    ? application.interviews.find((i) => i.id === interviewId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl font-bold">
                  {application.position.name}
                </CardTitle>
                <Badge
                  variant={
                    applicationStatusColors[application.status] || "outline"
                  }
                >
                  {application.status.charAt(0).toUpperCase() +
                    application.status.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Applied {formatDate(application.createdAt)}</span>
                </div>
                {application.updatedAt &&
                  application.updatedAt.getTime() !==
                    application.createdAt.getTime() && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Updated {formatDate(application.updatedAt)}</span>
                    </div>
                  )}
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/candidates/${application.candidateId}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    View Candidate
                  </Link>
                </Button>
              </div>
            </div>
            {currentUser && (
              <Button asChild>
                <Link href={`/applications/${id}?action=record`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Interview
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Progress Timeline */}
      <ApplicationProgressTimeline
        rounds={application.rounds}
        interviews={application.interviews}
      />

      {/* Interviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle className="text-lg">Interviews</CardTitle>
            </div>
            <Badge variant="secondary">
              {application.interviews.length} recorded
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {application.interviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-4">
                No interviews recorded yet for this application.
              </p>
              {currentUser && (
                <Button asChild>
                  <Link href={`/applications/${id}?action=record`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record First Interview
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {application.interviews.map((interview) => (
                <InterviewDetailCard
                  key={interview.id}
                  interview={interview}
                  applicationId={id}
                  isSelected={interview.id === interviewId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Interview Dialog */}
      {showRecordDialog && currentUser && (
        <RecordInterviewDialog
          applicationId={id}
          application={application}
          users={users}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  );
};

const ApplicationLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
