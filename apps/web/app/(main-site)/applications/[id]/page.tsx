import React, { Suspense } from "react";
import { getApplicationWithInterviews, getUsers } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Circle,
  XCircle,
  ArrowLeft,
  Plus,
  Eye,
  UserCheck,
  UserX,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { auth } from "@/auth";
import { headers } from "next/headers";
import RecordInterviewDialogWrapper from "@/components/record-interview-dialog-wrapper";
import InterviewDetailCard from "@/components/interview-detail-card";
import ApplicationProgressTimeline from "@/components/application-progress-timeline";
import ApplicationStatusDisplay from "@/components/application-status-display";
import { ApplicationDetailSkeleton } from "@/components/skeletons/application-detail-skeleton";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ interview?: string }>;

const ApplicationPage = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <BackButton />
      <Suspense fallback={<ApplicationDetailSkeleton />}>
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
  const { interview: interviewId } = await searchParams;
  const application = await getApplicationWithInterviews(id);
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const users = await getUsers();

  if (!application) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Application not found</h1>
        <p className="text-muted-foreground">
          The application you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/applications">Back to Applications</Link>
        </Button>
      </div>
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

  const applicationStatusIcons: Record<string, typeof Clock> = {
    pending: Clock,
    reviewed: Eye,
    shortlisted: CheckCircle2,
    interviewing: UserCheck,
    hired: CheckCircle2,
    rejected: XCircle,
    withdrawn: UserX,
  };

  const getStatusIcon = (status: string) => {
    const Icon = applicationStatusIcons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  const interviewStatusColors: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    pending: "outline",
    move_forward: "default",
    rejected: "destructive",
  } as const;

  const currentUser = session?.user;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">
                {application.position.name}
              </h1>
              <Badge
                variant={
                  applicationStatusColors[application.status] || "outline"
                }
                className="flex items-center gap-1.5 text-xs"
              >
                {getStatusIcon(application.status)}
                {application.status.charAt(0).toUpperCase() +
                  application.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>Applied {formatDate(application.createdAt)}</span>
              </div>
              {application.updatedAt &&
                application.updatedAt.getTime() !==
                  application.createdAt.getTime() && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Updated {formatDate(application.updatedAt)}</span>
                  </div>
                )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/candidates/${application.candidateId}`}>
                <ArrowLeft className="h-3 w-3 mr-2" />
                Candidate
              </Link>
            </Button>
            {currentUser && (
              <RecordInterviewDialogWrapper
                applicationId={id}
                application={application}
                users={users}
                currentUserId={currentUser.id}
              />
            )}
          </div>
        </div>
      </div>

      {/* Application Status */}
      {/* <div className="space-y-3">
        <ApplicationStatusDisplay application={application} />
      </div> */}

      {/* Progress Timeline */}
      <div className="space-y-3">
        <ApplicationProgressTimeline
          rounds={application.rounds}
          interviews={application.interviews}
        />
      </div>

      {/* Interviews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h2 className="text-base font-semibold">Interviews</h2>
          </div>
          <Badge variant="secondary" className="text-xs">
            {application.interviews.length} recorded
          </Badge>
        </div>
        {application.interviews.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border rounded-md">
            <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs mb-3">
              No interviews recorded yet for this application.
            </p>
            {currentUser && (
              <RecordInterviewDialogWrapper
                applicationId={id}
                application={application}
                users={users}
                currentUserId={currentUser.id}
                trigger={
                  <Button size="sm">
                    <Plus className="h-3 w-3 mr-2" />
                    Record First Interview
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
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
      </div>
    </div>
  );
};
