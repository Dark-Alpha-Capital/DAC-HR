import React, { Suspense } from "react";
import {
  getCandidateWithApplications,
  getDocumentsByCandidateId,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import BackButton from "@/components/back-button";
import {
  Pencil,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Circle,
  XCircle,
  Users,
  Plus,
  Eye,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import DeleteCandidateButton from "@/components/delete-candidate-button";
import { formatDate } from "@/lib/utils";
import { CandidateLoadingSkeleton } from "@/components/skeletons/candidate-skeleton";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import CandidateDocumentCard from "@/components/candidate-document-card";
import CandidateOnboardingSection from "@/components/candidate-onboarding-section";

type Params = Promise<{ uid: string }>;

const CandidatePage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space-mini container mx-auto">
      <BackButton />

      <Suspense fallback={<CandidateLoadingSkeleton />}>
        <DisplayCandidate params={params} />
      </Suspense>
      <Suspense fallback={<FormLoadingFallback />}>
        <CandidateOnboardingSection params={params} />
      </Suspense>
      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayCandidateDocuments params={params} />
      </Suspense>
    </div>
  );
};

export default CandidatePage;

const DisplayCandidateDocuments = async ({ params }: { params: Params }) => {
  const { uid } = await params;
  const documents = await getDocumentsByCandidateId(uid);

  return (
    <Card className="h-fit mt-4 md:mt-6 lg:mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">Documents</CardTitle>
          </div>
          <Badge variant="secondary">{documents.length}</Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-4">
              No documents found for this candidate.
            </p>
            <Button asChild>
              <Link href={`/candidates/${uid}/add-document`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <CandidateDocumentCard
                key={document.id}
                document={document}
                candidateId={uid}
              />
            ))}
            <div className="pt-2">
              <Button variant="outline" asChild>
                <Link href={`/candidates/${uid}/add-document`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DisplayCandidate = async ({ params }: { params: Params }) => {
  const { uid } = await params;
  const candidate = await getCandidateWithApplications(uid);

  if (!candidate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Candidate not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The candidate you're looking for doesn't exist or has been removed.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/candidates">Back to Candidates</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const fullName = `${candidate.firstName} ${candidate.lastName}`;
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
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <CardTitle className="text-3xl font-bold">{fullName}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(candidate.createdAt)}
                </Badge>
                {candidate.updatedAt &&
                  candidate.updatedAt.getTime() !==
                    candidate.createdAt.getTime() && (
                    <Badge variant="outline" className="gap-1.5">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(candidate.updatedAt)}
                    </Badge>
                  )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/candidates/${candidate.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <DeleteCandidateButton candidateId={candidate.id} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-4 md:mt-6 lg:mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-4 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0" />
                <a
                  href={`mailto:${candidate.email}`}
                  className="hover:text-foreground transition-colors"
                >
                  {candidate.email}
                </a>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a
                    href={`tel:${candidate.phone}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {candidate.phone}
                  </a>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{candidate.location}</span>
                </div>
              )}
              {candidate.source && (
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-4 w-4 shrink-0" />
                  <span>{candidate.source}</span>
                </div>
              )}
            </div>
          </CardContent>
          {candidate.note && (
            <>
              <Separator />
              <CardContent className="pt-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Notes
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
                    {candidate.note}
                  </p>
                </div>
              </CardContent>
            </>
          )}
          <Separator />
          <CardFooter className="pt-6">
            <div className="text-xs text-muted-foreground w-full">
              <span className="font-medium">ID:</span>{" "}
              <span className="font-mono">{candidate.id}</span>
            </div>
          </CardFooter>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <CardTitle className="text-lg">Application</CardTitle>
              </div>
              <Badge variant="secondary">{candidate.applications.length}</Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {candidate.applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  No applications found for this candidate.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidate.applications.map((app) => (
                  <div
                    key={app.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base mb-1 truncate">
                          {app.position.name}
                        </h4>
                        {app.position.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {app.position.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          applicationStatusColors[app.status] || "outline"
                        }
                        className="shrink-0"
                      >
                        {app.status.charAt(0).toUpperCase() +
                          app.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{formatDate(app.createdAt)}</span>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          asChild
                        >
                          <Link href={`/positions/${app.position.slug}`}>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>
                            Interviews ({app.interviews?.length || 0})
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          asChild
                        >
                          <Link href={`/applications/${app.id}?action=record`}>
                            <Plus className="h-3 w-3 mr-1" />
                            Record
                          </Link>
                        </Button>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-2"
                                  asChild
                                >
                                  <Link
                                    href={`/applications/${app.id}?interview=${interview.id}`}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Link>
                                </Button>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
