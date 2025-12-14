import React, { Suspense } from "react";
import {
  getCandidateWithApplications,
  getDocumentsByCandidateId,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import {
  Pencil,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  Circle,
  XCircle,
  Users,
  Plus,
  Eye,
  FileText,
  Link as LinkIcon,
  User,
  ClipboardCheck,
} from "lucide-react";
import DeleteCandidateButton from "@/components/delete-candidate-button";
import { formatDate } from "@/lib/utils";
import { CandidateDetailSkeleton } from "@/components/skeletons/candidate-detail-skeleton";
import { SectionSkeleton } from "@/components/skeletons/section-skeleton";
import CandidateDocumentTable from "@/components/candidate-document-table";
import CandidateOnboardingSection from "@/components/candidate-onboarding-section";
import { UserAuthenticated } from "@/components/auth-checks";
import InlineApplicationStatusEditor from "@/components/inline-application-status-editor";
import { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";

type Params = Promise<{ uid: string }>;

async function CachedCandidateForMetadata(uid: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");
  cacheTag(`candidate-applications-${uid}`);

  return await getCandidateWithApplications(uid);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { uid } = await params;
  const candidate = await CachedCandidateForMetadata(uid);

  if (!candidate) {
    return {
      title: "Candidate Not Found - DAC HR",
      description:
        "The candidate you're looking for doesn't exist or has been removed.",
    };
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;
  const applicationsCount = candidate.applications.length;
  const applicationsText =
    applicationsCount === 1 ? "application" : "applications";

  return {
    title: `${fullName} - Candidate - DAC HR`,
    description: `Candidate profile for ${fullName}${candidate.email ? ` (${candidate.email})` : ""}. ${
      applicationsCount > 0
        ? `${applicationsCount} ${applicationsText} on file.`
        : "No applications yet."
    }${candidate.location ? ` Located in ${candidate.location}.` : ""}`,
  };
}

const CandidatePage = async ({ params }: { params: Params }) => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <Suspense fallback={<CandidateDetailSkeleton />}>
        <CandidatePageContentWrapper params={params} />
      </Suspense>
    </div>
  );
};

export default CandidatePage;

// Component (not cached) reads runtime data
const CandidatePageContentWrapper = async ({ params }: { params: Params }) => {
  const { uid } = await params;
  return <CachedCandidatePageContent uid={uid} />;
};

// Cached component receives data as props
async function CachedCandidatePageContent({ uid }: { uid: string }) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");
  cacheTag(`candidate-applications-${uid}`);

  const candidate = await getCandidateWithApplications(uid);

  if (!candidate) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Candidate not found</h1>
        <p className="text-muted-foreground">
          The candidate you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/candidates">Back to Candidates</Link>
        </Button>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">{fullName}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1.5">
              <Calendar className="h-3 w-3" />
              Created {formatDate(candidate.createdAt)}
            </Badge>
            {candidate.updatedAt &&
              candidate.updatedAt.getTime() !==
                candidate.createdAt.getTime() && (
                <Badge variant="outline" className="text-xs gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(candidate.updatedAt)}
                </Badge>
              )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/candidates/${candidate.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Candidate
            </Link>
          </Button>
          <DeleteCandidateButton candidateId={candidate.id} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <User className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="applications">
            <Briefcase className="h-4 w-4 mr-2" />
            Applications
            {candidate.applications.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-5 px-1.5 text-xs"
              >
                {candidate.applications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
            <Suspense fallback={null}>
              <CachedDocumentsCount uid={uid} />
            </Suspense>
          </TabsTrigger>
          <TabsTrigger value="onboarding">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Onboarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <OverviewTab candidate={candidate} />
          </Suspense>
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <ApplicationsTab candidate={candidate} />
          </Suspense>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <CachedDisplayCandidateDocuments uid={uid} />
          </Suspense>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <CandidateOnboardingSection uid={uid} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component (not cached) reads runtime data
const DocumentsCountWrapper = async ({ params }: { params: Params }) => {
  const { uid } = await params;
  return <CachedDocumentsCount uid={uid} />;
};

// Cached component receives data as props
async function CachedDocumentsCount({ uid }: { uid: string }) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`candidate-documents-${uid}`);

  const documents = await getDocumentsByCandidateId(uid);
  return documents.length > 0 ? (
    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
      {documents.length}
    </Badge>
  ) : null;
}

const DocumentsCount = DocumentsCountWrapper;

// Component (not cached) reads runtime data
const DisplayCandidateDocumentsWrapper = async ({
  params,
}: {
  params: Params;
}) => {
  const { uid } = await params;
  return <CachedDisplayCandidateDocuments uid={uid} />;
};

// Cached component receives data as props
async function CachedDisplayCandidateDocuments({ uid }: { uid: string }) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`candidate-documents-${uid}`);

  const documents = await getDocumentsByCandidateId(uid);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Documents</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/candidates/${uid}/add-document`}>Add Document</Link>
          </Button>
        </div>
        <Badge variant="secondary">{documents.length}</Badge>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-4">No documents found for this candidate.</p>
          <Button size="sm" asChild>
            <Link href={`/candidates/${uid}/add-document`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Link>
          </Button>
        </div>
      ) : (
        <CandidateDocumentTable documents={documents} candidateId={uid} />
      )}
    </div>
  );
}

const OverviewTab = ({
  candidate,
}: {
  candidate: Awaited<ReturnType<typeof getCandidateWithApplications>>;
}) => {
  if (!candidate) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${candidate.email}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {candidate.email}
                </a>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`tel:${candidate.phone}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {candidate.phone}
                  </a>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {candidate.location}
                  </span>
                </div>
              )}
              {candidate.source && (
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {candidate.sourceUrl ? (
                    <a
                      href={candidate.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      {candidate.source}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {candidate.source}
                    </span>
                  )}
                </div>
              )}
            </div>

            {candidate.note && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {candidate.note}
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">ID:</span>{" "}
                <span className="font-mono">{candidate.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Applications</p>
                  <p className="text-xs text-muted-foreground">
                    Across all positions
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-base font-semibold">
                {candidate.applications.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ApplicationsTab = ({
  candidate,
}: {
  candidate: Awaited<ReturnType<typeof getCandidateWithApplications>>;
}) => {
  if (!candidate) return null;

  const interviewStatusColors: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    pending: "outline",
    move_forward: "default",
    rejected: "destructive",
  } as const;

  const getInterviewStatusIcon = (status: string) => {
    switch (status) {
      case "move_forward":
        return <CheckCircle2 className="h-3 w-3" />;
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Applications</h2>
        </div>
        <Badge variant="secondary">{candidate.applications.length}</Badge>
      </div>
      {candidate.applications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No applications found for this candidate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidate.applications.map((app) => (
            <div
              key={app.id}
              className="border rounded-md p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1 truncate">
                    {app.position.name}
                  </h4>
                  {app.position.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {app.position.description}
                    </p>
                  )}
                </div>
                <InlineApplicationStatusEditor
                  application={{ id: app.id, status: app.status }}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                <span>{formatDate(app.createdAt)}</span>
                {app.personality && (
                  <Badge variant="outline" className="text-xs">
                    Personality: {app.personality}
                  </Badge>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    asChild
                  >
                    <Link href={`/applications/${app.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>Interviews ({app.interviews?.length || 0})</span>
                  </div>
                </div>
                {app.interviews && app.interviews.length > 0 && (
                  <div className="space-y-1.5">
                    {app.interviews.map((interview) => (
                      <div
                        key={interview.id}
                        className="flex items-center justify-between text-xs p-2 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getInterviewStatusIcon(interview.status)}
                          <span className="truncate">
                            {interview.roundTemplate.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {interview.scheduledAt && (
                            <span className="text-muted-foreground">
                              {formatDate(interview.scheduledAt)}
                            </span>
                          )}
                          <Badge
                            variant={
                              interviewStatusColors[interview.status] ||
                              "outline"
                            }
                            className="text-xs h-5"
                          >
                            {interview.status === "move_forward"
                              ? "Move Forward"
                              : interview.status.charAt(0).toUpperCase() +
                                interview.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
