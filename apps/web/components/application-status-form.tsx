"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { updateApplication } from "@/lib/actions/update-application";
import { toast } from "sonner";

type ApplicationStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "interviewing"
  | "hired"
  | "rejected"
  | "withdrawn";

interface ApplicationStatusFormProps {
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

const statusDescriptions: Record<ApplicationStatus, string> = {
  pending: "Application is pending initial review",
  reviewed: "Application has been reviewed",
  shortlisted: "Candidate has been shortlisted",
  interviewing: "Candidate is in the interview process",
  hired: "Candidate has been hired",
  rejected: "Application has been rejected",
  withdrawn: "Application has been withdrawn",
};

export default function ApplicationStatusForm({
  application,
}: ApplicationStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateApplication({
        applicationId: application.id,
        status,
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to update application status"
        );
        return;
      }

      toast.success("Application status updated");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">Application Status</Label>
        <Select
          value={status}
          onValueChange={(value: ApplicationStatus) => setStatus(value)}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {statusDescriptions[value as ApplicationStatus]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save Status"}
        </Button>
      </div>
    </form>
  );
}

