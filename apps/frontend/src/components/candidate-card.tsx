import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Eye, Pencil } from "lucide-react";
import type { Candidate } from "@workspace/db/schema";
import DeleteCandidateButton from "./delete-candidate-button";
import { ApplicationStatusBadge } from "~/components/application-status-badge";

interface CandidateCardProps {
  candidate: Candidate & {
    applicationStatus?: string | null;
  };
}

const CandidateCard = ({ candidate }: CandidateCardProps) => {
  const fullName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="">{fullName}</CardTitle>
          {candidate.applicationStatus ? (
            <ApplicationStatusBadge
              status={candidate.applicationStatus}
              className="shrink-0"
            />
          ) : null}
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
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/candidates/${candidate.id}` as any}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/candidates/${candidate.id}/edit` as any}>
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
