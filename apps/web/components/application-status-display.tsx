"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Edit } from "lucide-react";
import ApplicationStatusForm from "./application-status-form";
import {
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
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
  const [isOpen, setIsOpen] = useState(false);
  const StatusIcon = statusIcons[application.status];

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-5 w-5 text-muted-foreground" />
            <Badge
              variant={statusColors[application.status]}
              className="text-sm font-medium"
            >
              {statusLabels[application.status]}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
            <DialogDescription>
              Change the current status of this application. The status will be
              updated immediately.
            </DialogDescription>
          </DialogHeader>
          <ApplicationStatusForm
            application={application}
            onSuccess={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
