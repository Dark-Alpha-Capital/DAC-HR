import React, { Suspense } from "react";
import {
  getApplicationWithInterviews,
  getUsers,
  getCandidateById,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Eye,
  UserCheck,
  UserX,
  FileText,
  MessageSquare,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { auth } from "@/auth";
import { headers } from "next/headers";
import RecordInterviewDialogWrapper from "@/components/record-interview-dialog-wrapper";
import ApplicationProgressTimeline from "@/components/application-progress-timeline";
import ApplicationStatusDisplay from "@/components/application-status-display";
import ApplicationPersonalitySelector from "@/components/application-personality-selector";
import { ApplicationDetailSkeleton } from "@/components/skeletons/application-detail-skeleton";
import { UserAuthenticated } from "@/components/auth-checks";
import ApplicationTabsContent from "@/components/application-tabs-content";
import { Metadata } from "next";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ interview?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const application = await getApplicationWithInterviews(id);

  if (!application) {
    return {
      title: "Application Not Found - DAC HR",
      description:
        "The application you're looking for doesn't exist or has been removed.",
    };
  }

  const candidate = await getCandidateById(application.candidateId);
  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : "Candidate";
  const statusCapitalized =
    application.status.charAt(0).toUpperCase() + application.status.slice(1);

  return {
    title: `${application.position.name} - Application - DAC HR`,
    description: `Application for ${application.position.name} by ${candidateName}. Status: ${statusCapitalized}. ${
      application.interviews && application.interviews.length > 0
        ? `${application.interviews.length} interview(s) recorded.`
        : ""
    }`,
  };
}

const ApplicationPage = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

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
            <Button size="sm" variant="link" asChild>
              <Link href={`/candidates/${application.candidateId}`}>
                View Candidate
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

      {/* Tabs for organizing content */}
      <ApplicationTabsContent
        application={application}
        applicationId={id}
        interviewId={interviewId}
        currentUser={currentUser}
        users={users}
      />
    </div>
  );
};
