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
import ApplicationBreadcrumb from "@/components/application-breadcrumb";
import { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { User, Mail } from "lucide-react";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ interview?: string }>;

// Cached function for application with interviews
async function CachedApplicationForMetadata(applicationId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`application-${applicationId}`);

  const application = await getApplicationWithInterviews(applicationId);

  // Add position cache tag to enable invalidation when rounds change
  if (application) {
    cacheTag(`position-${application.positionId}`);
  }

  return application;
}

// Cached function for candidate
async function CachedCandidateById(candidateId: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");
  cacheTag(`candidate-${candidateId}`);

  return await getCandidateById(candidateId);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const application = await CachedApplicationForMetadata(id);

  if (!application) {
    return {
      title: "Application Not Found - DAC HR",
      description:
        "The application you're looking for doesn't exist or has been removed.",
    };
  }

  const candidate = await CachedCandidateById(application.candidateId);
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
        <DisplayApplicationWrapper
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </div>
  );
};

export default ApplicationPage;

// Component (not cached) reads runtime data
const DisplayApplicationWrapper = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const { id } = await params;
  const { interview: interviewId } = await searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Fetch users dynamically (not cached)
  const users = await getUsers();

  return (
    <CachedDisplayApplication
      applicationId={id}
      interviewId={interviewId}
      currentUser={session?.user}
      users={users}
    />
  );
};

// Helper function to get application status badge
function getApplicationStatusBadge(status: string) {
  type StatusConfig = {
    label: string;
    variant: "default" | "secondary" | "destructive";
    className: string;
  };

  const defaultConfig: StatusConfig = {
    label: "Pending",
    variant: "secondary",
    className: "border-0",
  };

  const statusConfig: Record<string, StatusConfig> = {
    pending: defaultConfig,
    reviewed: {
      label: "Reviewed",
      variant: "secondary",
      className: "border-0",
    },
    shortlisted: {
      label: "Shortlisted",
      variant: "default",
      className: "border-0",
    },
    interviewing: {
      label: "Interviewing",
      variant: "default",
      className: "border-0",
    },
    hired: {
      label: "Hired",
      variant: "default",
      className:
        "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    rejected: {
      label: "Rejected",
      variant: "destructive",
      className: "border-0",
    },
    withdrawn: {
      label: "Withdrawn",
      variant: "secondary",
      className: "border-0",
    },
  };

  const config = statusConfig[status] ?? defaultConfig;
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

// Cached component receives data as props
async function CachedDisplayApplication({
  applicationId,
  interviewId,
  currentUser,
  users,
}: {
  applicationId: string;
  interviewId?: string;
  currentUser?: { id: string; email?: string | null; name?: string | null };
  users: Awaited<ReturnType<typeof getUsers>>;
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`application-${applicationId}`);

  const application = await getApplicationWithInterviews(applicationId);

  // Add position cache tag to enable invalidation when rounds change
  if (application) {
    cacheTag(`position-${application.positionId}`);
  }

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

  // Fetch candidate information
  const candidate = await CachedCandidateById(application.candidateId);
  const candidateName = candidate
    ? `${candidate.firstName} ${candidate.lastName}`
    : "Unknown Candidate";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <ApplicationBreadcrumb
        candidateName={candidateName}
        positionName={application.position.name}
        applicationId={applicationId}
      />

      {/* Header */}
      <div className="space-y-6">
        {/* Candidate and Position Info */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 flex-1">
            {/* Candidate Name - Prominent */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {candidateName}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {candidate?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{candidate.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Position and Status */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  {application.position.name}
                </p>
                {getApplicationStatusBadge(application.status)}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/candidates/${application.candidateId}`}>
                <User className="h-4 w-4 mr-2" />
                View Candidate
              </Link>
            </Button>
            {currentUser && (
              <RecordInterviewDialogWrapper
                applicationId={applicationId}
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
        applicationId={applicationId}
        interviewId={interviewId}
        currentUser={currentUser}
        users={users}
      />
    </div>
  );
}
