import { Suspense } from "react";
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
  Briefcase,
  FileText,
  User,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import DeleteCandidateButton from "@/components/delete-candidate-button";
import { formatDate } from "@/lib/utils";
import { CandidateDetailSkeleton } from "@/components/skeletons/candidate-detail-skeleton";
import { SectionSkeleton } from "@/components/skeletons/section-skeleton";
import CandidateOnboardingSection from "@/components/candidate-onboarding-section";
import CandidateAiScreeningsTab from "@/components/candidate-ai-screenings-tab";
import CandidateTabsClient from "@/components/candidate-tabs-client";
import { OverviewTab } from "./_components/overview-tab";
import { ApplicationsTab } from "./_components/applications-tab";
import {
  CachedDocumentsCount,
  DocumentsTab,
} from "./_components/documents-tab";
import { AiAnalysisTab } from "./_components/ai-analysis-tab";
import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { Session } from "better-auth";
import { headers } from "next/headers";
import { getCachedCandidate } from "@/lib/cache/candidate";
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
    <div className="space-y-6">
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

  const [users, candidate] = await Promise.all([
    getUsers(),
    getCachedCandidate(uid),
  ]);

  if (!candidate) {
    notFound();
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
            <DocumentsTab uid={uid} />
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
            <AiAnalysisTab
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

// Non-cached component - fetch fresh data every time for AI screenings
async function ScreeningsCount({ uid }: { uid: string }) {
  const screenings = await getCandidateAiScreenings(uid);
  return screenings.length > 0 ? (
    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
      {screenings.length}
    </Badge>
  ) : null;
}
