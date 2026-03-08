import React, { Suspense } from "react";
import { getCandidateAiScreenings, getUsers } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import Link from "next/link";
import {
  Pencil,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Users,
  Plus,
  FileText,
  Link as LinkIcon,
  User,
  ClipboardCheck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import DeleteCandidateButton from "@/components/delete-candidate-button";
import { formatDate } from "@/lib/utils";
import { CandidateDetailSkeleton } from "@/components/skeletons/candidate-detail-skeleton";
import { SectionSkeleton } from "@/components/skeletons/section-skeleton";
import CandidateDocumentTable from "@/components/candidate-document-table";
import CandidateOnboardingSection from "@/components/candidate-onboarding-section";
import { UserAuthenticated } from "@/components/auth-checks";
import InlineApplicationStatusEditor from "@/components/inline-application-status-editor";
import CandidateAiScreeningsTab from "@/components/candidate-ai-screenings-tab";
import CandidateAiAnalysis from "@/components/candidate-ai-analysis";
import CandidateTabsClient from "@/components/candidate-tabs-client";
import ApplicationDetailInline from "@/components/application-detail-inline";
import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Session } from "better-auth";
import { headers } from "next/headers";
import { getCachedCandidate, getCachedDocuments } from "@/lib/cache/candidate";
type Params = Promise<{ uid: string }>;
type SearchParams = Promise<{ tab?: string; application?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { uid } = await params;
  const candidate = await getCachedCandidate(uid);

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

const CandidatePage = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<CandidateDetailSkeleton />}>
        <CandidatePageContentWrapper
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </div>
  );
};

export default CandidatePage;

// Component (not cached) reads runtime data
const CandidatePageContentWrapper = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const { uid } = await params;
  const { application } = await searchParams;
  const requestHeaders = await headers();

  const sessionResult = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!sessionResult?.user) {
    redirect("/login");
  }

  const [users, candidate] = await Promise.all([getUsers(), getCachedCandidate(uid)]);

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

  return (
    <CandidatePageContent
      uid={uid}
      candidate={candidate}
      session={sessionResult.session}
      currentUser={sessionResult.user}
      users={users}
      initialApplicationId={application ?? undefined}
    />
  );
};

const CandidatePageContent = ({
  uid,
  candidate,
  session,
  currentUser,
  users,
  initialApplicationId,
}: {
  uid: string;
  candidate: NonNullable<Awaited<ReturnType<typeof getCachedCandidate>>>;
  session: Session;
  currentUser: { id: string; email?: string | null; name?: string | null };
  users: Awaited<ReturnType<typeof getUsers>>;
  initialApplicationId?: string;
}) => {
  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">{fullName}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs gap-1.5">
              <Calendar className="h-3 w-3" />
              Created {formatDate(candidate.createdAt)}
            </Badge>
            {candidate.updatedAt &&
              candidate.updatedAt.getTime() !==
                candidate.createdAt.getTime() && (
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(candidate.updatedAt)}
                </Badge>
              )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/candidates/${candidate.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Candidate
            </Link>
          </Button>
          <DeleteCandidateButton candidateId={candidate.id} />
        </div>
      </div>

      {/* Tabs */}
      <CandidateTabsClient>
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
          <TabsTrigger value="ai-screenings">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Screenings
            <Suspense fallback={null}>
              <ScreeningsCount uid={uid} />
            </Suspense>
          </TabsTrigger>
          <TabsTrigger value="ai-analysis">
            <Sparkles className="h-4 w-4 mr-2" />
            Do AI Analysis
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab candidate={candidate} />
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <ApplicationsTab
            candidate={candidate}
            users={users}
            initialApplicationId={initialApplicationId}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <CachedDisplayCandidateDocuments uid={uid} />
          </Suspense>
        </TabsContent>

        <TabsContent value="ai-screenings" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <CandidateAiScreeningsTab
              candidateId={uid}
              positionId={candidate.applications[0]?.position.id ?? null}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="ai-analysis" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <CandidateAiAnalysisWrapper
              candidateId={uid}
              positionId={candidate.applications[0]?.position.id ?? ""}
              session={session}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="checklist" className="mt-6">
          <Suspense fallback={<SectionSkeleton />}>
            <CandidateOnboardingSection uid={uid} />
          </Suspense>
        </TabsContent>
      </CandidateTabsClient>
    </div>
  );
};

async function CachedDocumentsCount({ uid }: { uid: string }) {
  const documents = await getCachedDocuments(uid);
  return documents.length > 0 ? (
    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
      {documents.length}
    </Badge>
  ) : null;
}

async function CachedDisplayCandidateDocuments({ uid }: { uid: string }) {
  const documents = await getCachedDocuments(uid);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Documents</h2>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/candidates/${uid}/add-document`}>Add Document</Link>
          </Button>
        </div>
        <Badge variant="secondary">{documents.length}</Badge>
      </div>

      {documents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
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

async function CandidateAiAnalysisWrapper({
  candidateId,
  positionId,
  session,
}: {
  candidateId: string;
  positionId: string;
  session: Session;
}) {
  const documents = await getCachedDocuments(candidateId);

  return (
    <CandidateAiAnalysis
      candidateId={candidateId}
      positionId={positionId}
      session={session}
      documents={documents}
    />
  );
}

const OverviewTab = ({
  candidate,
}: {
  candidate: Awaited<ReturnType<typeof getCachedCandidate>>;
}) => {
  if (!candidate) return null;

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Contact
        </h3>
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
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Notes
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {candidate.note}
            </p>
          </div>
        )}
        <div className="mt-6 pt-6 border-t">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium">ID</span>{" "}
            <span className="font-mono">{candidate.id}</span>
          </span>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Applications
        </h3>
        <div className="flex items-center gap-3">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-medium">{candidate.applications.length}</span>{" "}
            <span className="text-muted-foreground">total</span>
          </span>
        </div>
      </section>
    </div>
  );
};

// Non-cached component - fetch fresh data every time for AI screenings
async function ScreeningsCount({ uid }: { uid: string }) {
  const screenings = await getCandidateAiScreenings(uid);
  return screenings.length > 0 ? (
    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
      {screenings.length}
    </Badge>
  ) : null;
}

const ApplicationsTab = ({
  candidate,
  users,
  initialApplicationId,
  currentUser,
}: {
  candidate: Awaited<ReturnType<typeof getCachedCandidate>>;
  users: Awaited<ReturnType<typeof getUsers>>;
  initialApplicationId?: string;
  currentUser: { id: string; email?: string | null; name?: string | null };
}) => {
  if (!candidate) return null;

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
        <div className="py-12 text-center text-muted-foreground">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No applications found for this candidate.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {candidate.applications.map((app, index) => (
            <details
              key={app.id}
              className="group py-4 first:pt-0 [&[open]_summary_svg]:rotate-180"
              open={
                initialApplicationId
                  ? app.id === initialApplicationId
                  : index === 0
              }
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-medium line-clamp-2">
                      {app.position.name}
                    </h3>
                    <InlineApplicationStatusEditor
                      application={{ id: app.id, status: app.status }}
                      candidateId={candidate.id}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0" />
                      Applied {formatDate(app.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 shrink-0" />
                      {app.interviews?.length || 0}{" "}
                      {app.interviews?.length === 1
                        ? "interview"
                        : "interviews"}
                    </span>
                    {app.personality && (
                      <Badge variant="secondary" className="text-xs">
                        {app.personality}
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
              </summary>
              <div className="mt-4 pl-0">
                <Suspense fallback={<SectionSkeleton />}>
                  <ApplicationDetailInline
                    applicationId={app.id}
                    currentUser={currentUser}
                    users={users}
                  />
                </Suspense>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
};
