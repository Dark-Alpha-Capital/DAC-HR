"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Input } from "@workspace/ui/components/input";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { updateInterview } from "@/lib/actions/update-interview";
import { toast } from "sonner";

type InterviewStatus = "scheduled" | "completed" | "cancelled";

interface InterviewSummaryFormProps {
  interview: {
    id: string;
    status: InterviewStatus;
    scheduledAt: Date | null;
    overallFeedback: string | null;
  };
  applicationId: string;
  hasNextStage: boolean;
}

const statusLabels: Record<InterviewStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusDescriptions: Record<InterviewStatus, string> = {
  scheduled: "Interview is scheduled or in progress",
  completed: "Interview has been completed",
  cancelled: "Interview was cancelled",
};

function formatDateForInput(value: Date | null) {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function InterviewSummaryForm({
  interview,
  applicationId,
  hasNextStage,
}: InterviewSummaryFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<InterviewStatus>(interview.status);
  const [overallFeedback, setOverallFeedback] = useState(
    interview.overallFeedback ?? ""
  );
  const [scheduledAt, setScheduledAt] = useState(
    formatDateForInput(interview.scheduledAt)
  );
  const [advanceStage, setAdvanceStage] = useState(false);
  const [isPending, startTransition] = useTransition();

  const showAdvanceStage = useMemo(
    () => status === "completed" && hasNextStage,
    [status, hasNextStage]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const parsedDate = scheduledAt ? new Date(scheduledAt) : null;

      const result = await updateInterview({
        interviewId: interview.id,
        status,
        overallFeedback: overallFeedback.trim(),
        scheduledAt: parsedDate,
        advanceStage: showAdvanceStage ? advanceStage : false,
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to update interview"
        );
        return;
      }

      toast.success("Interview updated");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: InterviewStatus) => setStatus(value)}
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
                      {statusDescriptions[value as InterviewStatus]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Update to reschedule or clear the date to remove it
          </p>
        </div>
      </div>

      {showAdvanceStage && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={advanceStage}
            onCheckedChange={(checked) => setAdvanceStage(checked === true)}
          />
          <span>
            Advance application to next stage after saving
            <span className="ml-1 text-xs text-muted-foreground">
              (Stage progression happens immediately)
            </span>
          </span>
        </label>
      )}

      <div className="space-y-2">
        <Label htmlFor="overallFeedback">Overall Feedback</Label>
        <Textarea
          id="overallFeedback"
          placeholder="Summarize the candidate's performance and recommendation"
          value={overallFeedback}
          onChange={(event) => setOverallFeedback(event.target.value)}
          minLength={0}
          rows={6}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/applications/${applicationId}`)}
          disabled={isPending}
        >
          Back to Application
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Interview"}
        </Button>
      </div>
    </form>
  );
}
