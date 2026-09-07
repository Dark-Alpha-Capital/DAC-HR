import { memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ApplicationStatusBadge,
  getApplicationStatusCardBorderClass,
} from "#/components/shared/application-status-badge";
import { formatDate, isNew } from "#/lib/utils";
import { Badge } from "#/components/ui/badge";
import CopyButton from "./copy-button";

type CandidateKanbanCardProps = {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
    position: { id: string; name: string } | null;
    applicationStatus: string;
  };
};

function CandidateKanbanCard({ candidate }: CandidateKanbanCardProps) {
  // The card is colored by the candidate's true application status so a card
  // that lands in the wrong column (multi-application candidates) is visible.
  const borderColor = getApplicationStatusCardBorderClass(
    candidate.applicationStatus,
  );
  const title = candidate.position
    ? `${candidate.firstName} ${candidate.lastName} - ${candidate.position.name}`
    : `${candidate.firstName} ${candidate.lastName}`;

  return (
    <Link
      to="/candidates/$uid"
      params={{ uid: candidate.id }}
      search={{ applicationId: undefined }}
      aria-label={`View ${candidate.firstName} ${candidate.lastName}`}
      className={`block bg-white dark:bg-card border border-border rounded-md p-3 cursor-pointer ${borderColor} border-l-4 min-w-0`}
    >
      <div className="mb-3 min-w-0">
        <h3 className="font-semibold text-sm leading-tight mb-1 [overflow-wrap:anywhere]">
          {title}
        </h3>
        <div className="flex min-w-0 items-center gap-1">
          <p className="text-xs text-muted-foreground truncate">
            {candidate.email}
          </p>
          <CopyButton value={candidate.email} label="email" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
        <ApplicationStatusBadge status={candidate.applicationStatus} />
        {isNew(candidate.createdAt) && (
          <Badge className="bg-primary text-primary-foreground border-0 text-xs">
            New
          </Badge>
        )}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {formatDate(candidate.createdAt)}
        </span>
      </div>
    </Link>
  );
}

export default memo(CandidateKanbanCard);
