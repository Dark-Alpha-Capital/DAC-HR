import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import DeleteCandidateButton from "./delete-candidate-button";
import { getApplicationStatusCardBorderClass } from "~/components/application-status-badge";
import { formatDate } from "~/lib/utils";

type CandidateKanbanCardProps = {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
    position: { id: string; name: string } | null;
  };
  status: string;
};

function CandidateKanbanCard({
  candidate,
  status,
}: CandidateKanbanCardProps) {
  const borderColor = getApplicationStatusCardBorderClass(status);
  const title = candidate.position
    ? `${candidate.firstName} ${candidate.lastName} - ${candidate.position.name}`
    : `${candidate.firstName} ${candidate.lastName}`;

  return (
    <div
      className={`bg-white dark:bg-card border border-border rounded-md p-3 hover:shadow-md transition-all ${borderColor} border-l-4 min-w-0`}
    >
      <div className="mb-3 min-w-0">
        <h3 className="font-semibold text-sm leading-tight mb-1 wrap-break-word">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
      </div>

      <div className="mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {formatDate(candidate.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <div className="ml-auto flex items-center gap-1">
          <Button variant="secondary" size="sm" className="h-7 w-7 p-0" asChild>
            <Link
              to={`/candidates/${candidate.id}` as any}
              aria-label={`View ${candidate.firstName} ${candidate.lastName}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="h-7 w-7 p-0" asChild>
            <Link
              to={`/candidates/${candidate.id}/edit` as any}
              aria-label={`Edit ${candidate.firstName} ${candidate.lastName}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <DeleteCandidateButton candidateId={candidate.id} />
        </div>
      </div>
    </div>
  );
}

export default memo(CandidateKanbanCard);
