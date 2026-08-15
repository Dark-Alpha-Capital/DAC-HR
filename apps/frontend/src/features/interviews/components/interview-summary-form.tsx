import { useState, useTransition } from "react";
import { z } from "zod";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { updateInterview } from "#/features/interviews/server/mutations/interviews";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Circle, Loader2 } from "lucide-react";
import type { InterviewStatus } from "#/lib/enums";

type EditableInterviewStatus = Exclude<InterviewStatus, "completed">;

interface InterviewSummaryFormProps {
  interview: {
    id: string;
    status: EditableInterviewStatus;
    rating: number | null;
    scheduledAt: Date | null;
    overallFeedback: string | null;
  };
  applicationId: string;
}

const statusOptions: {
  value: EditableInterviewStatus;
  label: string;
  icon: typeof CheckCircle;
}[] = [
  { value: "pending", label: "Pending", icon: Circle },
  { value: "scheduled", label: "Scheduled", icon: Clock },
  { value: "move_forward", label: "Move Forward", icon: CheckCircle },
  { value: "rejected", label: "Rejected", icon: XCircle },
];

export default function InterviewSummaryForm({
  interview,
  applicationId,
}: InterviewSummaryFormProps) {
  const invalidate = useQueryInvalidation();
  const [status, setStatus] = useState<EditableInterviewStatus>(
    interview.status,
  );
  const [rating, setRating] = useState<string>(
    interview.rating?.toString() ?? "none",
  );
  const [overallFeedback, setOverallFeedback] = useState(
    interview.overallFeedback ?? "",
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const parsedRating =
        rating && rating !== "none" ? parseInt(rating, 10) : undefined;

      const result = await updateInterview({
        data: {
          interviewId: interview.id,
          status,
          rating: parsedRating,
          overallFeedback: overallFeedback.trim() || undefined,
        },
      });

      if (result.error) {
        toast.error(
          z.string().safeParse(result.error).data || "Failed to update interview",
        );
        return;
      }

      toast.success("Interview updated");
      void invalidate.applicationDetail(applicationId);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm">
            Decision
          </Label>
          <Select
            value={status}
            onValueChange={(value: EditableInterviewStatus) => setStatus(value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rating" className="text-sm">
            Rating
          </Label>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger id="rating">
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No rating</SelectItem>
              {[1, 2, 3, 4, 5].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}/5
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="overallFeedback" className="text-sm">
          Overall Feedback
        </Label>
        <Textarea
          id="overallFeedback"
          placeholder="Summarize the candidate's performance..."
          value={overallFeedback}
          onChange={(event) => setOverallFeedback(event.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.history.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
