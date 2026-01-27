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
  | "ai_screening"
  | "first_round_recruiter_call"
  | "second_round_technical_screening"
  | "third_round_final_ceo"
  | "contract_offer"
  | "onboarding"
  | "rejected"
  | "withdrawn";

interface ApplicationStatusFormProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
  onSuccess?: () => void;
}

const statusLabels: Record<ApplicationStatus, string> = {
  ai_screening: "AI Screening",
  first_round_recruiter_call: "1st Round Recruiter Call",
  second_round_technical_screening: "2nd Round Technical Screening",
  third_round_final_ceo: "3rd Round Final Round with CEO",
  contract_offer: "Contract/Offer",
  onboarding: "Onboarding",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const statusDescriptions: Record<ApplicationStatus, string> = {
  ai_screening: "AI analysis is being performed on the candidate",
  first_round_recruiter_call: "First round interview with recruiter",
  second_round_technical_screening: "Second round technical screening interview",
  third_round_final_ceo: "Final round interview with CEO",
  contract_offer: "Contract has been requested or sent",
  onboarding: "Candidate is in the onboarding process",
  rejected: "Application has been rejected",
  withdrawn: "Application has been withdrawn",
};

export default function ApplicationStatusForm({
  application,
  onSuccess,
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
            : "Failed to update application status",
        );
        return;
      }

      toast.success("Application status updated");
      router.refresh();
      onSuccess?.();
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

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSuccess?.()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Status"}
        </Button>
      </div>
    </form>
  );
}
