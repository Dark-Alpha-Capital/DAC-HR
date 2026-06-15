import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Circle,
  XCircle,
  Eye,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface InterviewDetailCardProps {
  interview: {
    id: string;
    status: "pending" | "move_forward" | "rejected" | "scheduled";
    rating: number | null;
    scheduledAt: Date | null;
    overallFeedback: string | null;
    roundTemplate: {
      id: string;
      name: string;
      description: string | null;
    };
    interviewer: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  };
  applicationId: string;
  isSelected?: boolean;
}

export default function InterviewDetailCard({
  interview,
  applicationId,
  isSelected,
}: InterviewDetailCardProps) {
  const getStatusIcon = () => {
    switch (interview.status) {
      case "move_forward":
        return <CheckCircle2 className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const statusColors: Record<string, "default" | "secondary" | "destructive"> =
    {
      pending: "secondary",
      move_forward: "default",
      rejected: "destructive",
    };

  return (
    <div
      className={`border rounded-md p-4 space-y-3 ${
        isSelected ? "ring-2 ring-primary" : ""
      } hover:bg-accent/50 transition-colors`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {getStatusIcon()}
        <h3 className="font-semibold text-sm">
          {interview.roundTemplate.name}
        </h3>
        <Badge
          variant={statusColors[interview.status] || "secondary"}
          className="text-xs"
        >
          {interview.status === "move_forward"
            ? "Move Forward"
            : interview.status.charAt(0).toUpperCase() +
              interview.status.slice(1)}
        </Badge>
        {interview.rating && (
          <Badge variant="secondary" className="text-xs">
            {interview.rating}/5 ⭐
          </Badge>
        )}
      </div>
      {interview.roundTemplate.description && (
        <p className="text-xs text-muted-foreground">
          {interview.roundTemplate.description}
        </p>
      )}
      <div className="space-y-2 text-xs">
        {interview.scheduledAt && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">
              {formatDate(interview.scheduledAt)}
            </span>
          </div>
        )}
        {interview.interviewer && (
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Interviewer:</span>
            <span className="font-medium">
              {interview.interviewer.name || interview.interviewer.email}
            </span>
          </div>
        )}
        {interview.overallFeedback && (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-2">
              <FileText className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="text-muted-foreground block mb-1 text-xs">
                  Feedback:
                </span>
                <p className="text-foreground whitespace-pre-wrap text-xs">
                  {interview.overallFeedback}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="pt-2 border-t">
        <Button size="sm" variant="secondary" asChild>
          <Link to={`/interviews/${interview.id}` as any}>
            <Eye className="h-3 w-3 mr-2" />
            View Interview
          </Link>
        </Button>
      </div>
    </div>
  );
}
