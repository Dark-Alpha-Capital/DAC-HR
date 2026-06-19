import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Eye, Users, Pencil } from "lucide-react";
import DeleteCandidateButton from "./delete-candidate-button";
import { getApplicationStatusCardBorderClass } from "~/components/application-status-badge";

interface ApplicationCardProps {
  application: {
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    position: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
    };
    interviews: Array<{
      id: string;
      status: string;
    }>;
  };
  status?: string;
}

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks > 0) return `- ${diffWeeks} week${diffWeeks > 1 ? "s" : ""}`;
  if (diffDays > 0) return `- ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `- ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  return "- just now";
};

const ApplicationCard = ({ application, status }: ApplicationCardProps) => {
  const cardStatus = status || application.status;
  const borderColor = getApplicationStatusCardBorderClass(cardStatus);
  const timeAgo = getTimeAgo(application.updatedAt);

  return (
    <div
      className={`bg-white dark:bg-card border border-border rounded-md p-3 hover:shadow-md transition-all ${borderColor} border-l-4 min-w-0`}
    >
      <div className="mb-3 min-w-0">
        <h3 className="font-semibold text-sm leading-tight mb-1 wrap-break-word">
          {application.candidate.firstName} {application.candidate.lastName} -{" "}
          {application.position.name}
        </h3>
      </div>

      <div className="mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {timeAgo}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {application.interviews.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {application.interviews.length}
            </span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="secondary" size="sm" className="h-7 w-7 p-0" asChild>
            <Link
              to={`/candidates/${application.candidate.id}` as any}
              aria-label={`View ${application.candidate.firstName} ${application.candidate.lastName}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="h-7 w-7 p-0" asChild>
            <Link
              to={`/candidates/${application.candidate.id}/edit` as any}
              aria-label={`Edit ${application.candidate.firstName} ${application.candidate.lastName}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <DeleteCandidateButton candidateId={application.candidate.id} />
        </div>
      </div>
    </div>
  );
};

export default ApplicationCard;
