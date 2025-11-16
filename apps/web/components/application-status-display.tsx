"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Edit, Plus } from "lucide-react";
import ApplicationStatusForm from "./application-status-form";
import {
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  FileSearch,
} from "lucide-react";

type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "interviewing"
  | "hired"
  | "rejected"
  | "withdrawn";

interface ApplicationStatusDisplayProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
}

const statusLabels: Record<ApplicationStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const statusIcons: Record<ApplicationStatus, typeof Clock> = {
  pending: Clock,
  reviewed: Eye,
  shortlisted: CheckCircle2,
  interviewing: UserCheck,
  hired: CheckCircle2,
  rejected: XCircle,
  withdrawn: UserX,
};

const statusColors: Record<
  ApplicationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  reviewed: "secondary",
  shortlisted: "default",
  interviewing: "default",
  hired: "default",
  rejected: "destructive",
  withdrawn: "outline",
};

export default function ApplicationStatusDisplay({
  application,
}: ApplicationStatusDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when application data changes (after successful save)
  useEffect(() => {
    setIsEditing(false);
  }, [application.id, application.status]);

  const StatusIcon = statusIcons[application.status];

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Application Status</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        </div>
        <ApplicationStatusForm application={application} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Application Status</h3>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Status
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <StatusIcon className="h-5 w-5 text-muted-foreground" />
        <Badge variant={statusColors[application.status]} className="text-sm">
          {statusLabels[application.status]}
        </Badge>
      </div>
    </div>
  );
}

