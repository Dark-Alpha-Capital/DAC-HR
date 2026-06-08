import { useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { updateInterview } from "@/lib/actions/update-interview";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Circle, Loader2 } from "lucide-react";

type InterviewStatus = "pending" | "move_forward" | "rejected" | "scheduled";

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

const statusOptions: {
  value: InterviewStatus;
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
  const router = useRouter();
  const [status, setStatus] = useState<InterviewStatus>(interview.status);
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
        interviewId: interview.id,
        status: status as "pending" | "move_forward" | "rejected",
        rating: parsedRating,
        overallFeedback: overallFeedback.trim() || undefined,
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to update interview",
        );
        return;
      }

      toast.success("Interview updated");
      router.invalidate();
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
            onValueChange={(value: InterviewStatus) => setStatus(value)}
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
