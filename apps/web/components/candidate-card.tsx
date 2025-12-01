import React from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Eye, Pencil } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { candidate } from "@workspace/db/schema";
import DeleteCandidateButton from "./delete-candidate-button";

type Candidate = InferSelectModel<typeof candidate> & {
  applicationStatus?: string | null;
};

interface CandidateCardProps {
  candidate: Candidate;
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

const CandidateCard = ({ candidate }: CandidateCardProps) => {
  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="">{fullName}</CardTitle>
          {candidate.applicationStatus && (
            <Badge
              variant={applicationStatusColors[candidate.applicationStatus] || "outline"}
              className="shrink-0 text-xs"
            >
              {candidate.applicationStatus.charAt(0).toUpperCase() +
                candidate.applicationStatus.slice(1)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{candidate.email}</p>
          {candidate.phone && (
            <p className="text-muted-foreground">{candidate.phone}</p>
          )}
          {candidate.location && (
            <p className="text-muted-foreground">{candidate.location}</p>
          )}
          {candidate.note && (
            <p className="text-muted-foreground line-clamp-2 mt-2">
              {candidate.note}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/candidates/${candidate.id}`}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
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

export default CandidateCard;
