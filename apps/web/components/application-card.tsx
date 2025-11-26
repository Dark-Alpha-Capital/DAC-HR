import React from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Eye, Calendar, User, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

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

const ApplicationCard = ({ application }: ApplicationCardProps) => {
  return (
    <div className="border rounded-md p-4 hover:bg-accent/50 transition-colors space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1.5 truncate">
            {application.position.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {application.candidate.firstName} {application.candidate.lastName}
            </span>
          </div>
        </div>
        <Badge
          variant={applicationStatusColors[application.status] || "outline"}
          className="shrink-0 text-xs"
        >
          {application.status.charAt(0).toUpperCase() +
            application.status.slice(1)}
        </Badge>
      </div>
      {application.position.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {application.position.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(application.createdAt)}</span>
        </div>
        {application.interviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span>
              {application.interviews.length} interview
              {application.interviews.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
      <div className="pt-2 border-t">
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/applications/${application.id}`}>
            <Eye className="h-3 w-3 mr-2" />
            View Details
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ApplicationCard;
