import { useQuery } from "@tanstack/react-query";
import { DetailPageSkeleton } from "#/components/shared/detail-page-skeleton";
import { Link, useParams } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { TabsList, TabsTrigger, TabsContent } from "#/components/ui/tabs";
import {
  Pencil,
  Calendar,
  Clock,
  Briefcase,
  FileText,
  User,
  ClipboardCheck,
} from "lucide-react";
import DeleteCandidateButton from "#/features/candidates/components/delete-candidate-button";
import { formatDate } from "#/lib/utils";
import CandidateTabsClient from "#/features/candidates/components/candidate-tabs-client";
import { CandidateOverviewTab } from "#/features/candidates/components/candidate-overview-tab";
import { CandidateApplicationsTab } from "#/features/candidates/components/candidate-applications-tab";
import { CandidateDocumentsTab } from "#/features/candidates/components/candidate-documents-tab";
import OnboardingCard from "#/features/candidates/components/onboarding-card";
import { candidateDetailQueryOptions } from "#/features/candidates/server/queries/candidates";

export function CandidateDetailPage() {
  const { uid } = useParams({ from: "/_main/candidates/$uid/" });
  const { data, isLoading } = useQuery(candidateDetailQueryOptions(uid));

  if (isLoading && !data) {
    return <DetailPageSkeleton tabs tabCount={4} />;
  }

  if (!data) {
    return null;
  }

  const { candidate, documents, onboardingData, checklistItems } = data;

  if (!candidate) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Candidate not found</h1>
        <p className="text-muted-foreground">
          The candidate you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button variant="secondary" asChild>
          <Link to="/candidates" search={{} as never}>
            Back to candidates
          </Link>
        </Button>
      </div>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">{fullName}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs gap-1.5">
              <Calendar className="h-3 w-3" />
              Created {formatDate(candidate.createdAt)}
            </Badge>
            {candidate.updatedAt &&
            candidate.updatedAt.getTime() !== candidate.createdAt.getTime() ? (
              <Badge variant="secondary" className="text-xs gap-1.5">
                <Clock className="h-3 w-3" />
                Updated {formatDate(candidate.updatedAt)}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/candidates/$uid/edit" params={{ uid: candidate.id }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Candidate
            </Link>
          </Button>
          <DeleteCandidateButton candidateId={candidate.id} />
        </div>
      </div>

      <CandidateTabsClient>
        <TabsList>
          <TabsTrigger value="overview">
            <User className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="applications">
            <Briefcase className="h-4 w-4 mr-2" />
            Applications
            {candidate.applications.length > 0 ? (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-5 px-1.5 text-xs"
              >
                {candidate.applications.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
            {documents.length > 0 ? (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-5 px-1.5 text-xs"
              >
                {documents.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CandidateOverviewTab candidate={candidate} documents={documents} />
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <CandidateApplicationsTab candidate={candidate} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <CandidateDocumentsTab uid={uid} documents={documents} />
        </TabsContent>

        <TabsContent value="checklist" className="mt-6">
          <div className="mt-4 md:mt-6 lg:mt-8">
            <OnboardingCard
              candidateId={candidate.id}
              onboardingData={onboardingData}
              checklistItems={checklistItems}
            />
          </div>
        </TabsContent>
      </CandidateTabsClient>
    </div>
  );
}
