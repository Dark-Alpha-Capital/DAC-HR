import React, { Suspense } from "react";
import { getCandidateById } from "@workspace/db/queries";
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
import { Pencil, Calendar, Clock, Mail, Phone, MapPin } from "lucide-react";
import DeleteCandidateButton from "@/components/delete-candidate-button";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

const CandidatePage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
      <Suspense fallback={<CandidateLoadingSkeleton />}>
        <DisplayCandidate params={params} />
      </Suspense>
    </div>
  );
};

export default CandidatePage;

const CandidateLoadingSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
};

const DisplayCandidate = async ({ params }: { params: Params }) => {
  const { slug } = await params;
  const candidate = await getCandidateById(slug);

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
  const statusColors = {
    applied: "default",
    screening: "secondary",
    interviewing: "outline",
    hired: "default",
    rejected: "destructive",
  } as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-3xl">{fullName}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusColors[candidate.status]}>
                {candidate.status}
              </Badge>
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
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Contact Information</h3>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{candidate.location}</span>
                </div>
              )}
            </div>
          </div>
          {candidate.note && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {candidate.note}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex items-center justify-between gap-4 pt-6">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">ID:</span> {candidate.id}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/candidates/${candidate.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteCandidateButton candidateId={candidate.id} />
        </div>
      </CardFooter>
    </Card>
  );
};
