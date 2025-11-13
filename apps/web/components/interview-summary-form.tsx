"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Input } from "@workspace/ui/components/input";
import { updateInterview } from "@/lib/actions/update-interview";
import { toast } from "sonner";

type InterviewStatus = "pending" | "complete";

interface InterviewSummaryFormProps {
  interview: {
    id: string;
    status: InterviewStatus;
    rating: number | null;
    scheduledAt: Date | null;
    overallFeedback: string | null;
  };
  applicationId: string;
}

const statusLabels: Record<InterviewStatus, string> = {
  pending: "Pending",
  complete: "Complete",
};

const statusDescriptions: Record<InterviewStatus, string> = {
  pending: "Interview is pending or in progress",
  complete: "Interview has been completed",
};

function formatDateForInput(value: Date | null) {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function InterviewSummaryForm({
  interview,
  applicationId,
}: InterviewSummaryFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<InterviewStatus>(interview.status);
  const [rating, setRating] = useState<string>(
    interview.rating?.toString() ?? "none"
  );
  const [overallFeedback, setOverallFeedback] = useState(
    interview.overallFeedback ?? ""
  );
  const [scheduledAt, setScheduledAt] = useState(
    formatDateForInput(interview.scheduledAt)
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const parsedDate = scheduledAt ? new Date(scheduledAt) : null;
      const parsedRating = rating && rating !== "none" ? parseInt(rating, 10) : undefined;

      const result = await updateInterview({
        interviewId: interview.id,
        status,
        rating: parsedRating,
        overallFeedback: overallFeedback.trim() || undefined,
        scheduledAt: parsedDate,
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
          <Label htmlFor="rating">Rating (1-5)</Label>
          <Select
            value={rating}
            onValueChange={setRating}
          >
            <SelectTrigger id="rating">
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No rating</SelectItem>
              {[1, 2, 3, 4, 5].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? "star" : "stars"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Rate the candidate's performance (optional)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Interview Date & Time</Label>
        <Input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          When the interview took place (or leave empty)
        </p>
      </div>

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
