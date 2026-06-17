import { useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { createInterviewFeedback } from "~/lib/actions/create-interview-feedback";
import { toast } from "sonner";

interface QuestionFeedback {
  id: string;
  questionText: string;
  feedback: {
    id: string;
    notes: string | null;
    rating: number | null;
  } | null;
}

interface InterviewQuestionFeedbackFormProps {
  interviewId: string;
  question: QuestionFeedback;
  index: number;
  onSuccess?: () => void;
  hideWrapper?: boolean;
}

export default function InterviewQuestionFeedbackForm({
  interviewId,
  question,
  index,
  onSuccess,
  hideWrapper = false,
}: InterviewQuestionFeedbackFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(question.feedback?.notes ?? "");
  const [rating, setRating] = useState<string>(
    question.feedback?.rating?.toString() ?? "none",
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const parsedRating =
        rating && rating !== "none" ? parseInt(rating, 10) : undefined;

      const result = await createInterviewFeedback({
        data: {
          interviewId,
          questionId: question.id,
          notes: notes.trim() === "" ? undefined : notes.trim(),
          rating: parsedRating,
        },
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to save feedback",
        );
        return;
      }

      toast.success("Feedback saved");
      router.invalidate();
      onSuccess?.();
    });
  };

  const content = (
    <>
      {!hideWrapper && (
        <div className="space-y-1 mb-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              Question {index + 1}
            </p>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {question.questionText}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`rating-${question.id}`}>Rating (1-5)</Label>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger id={`rating-${question.id}`} className="w-full">
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
            Rate the candidate's answer to this question (optional)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`notes-${question.id}`}>Notes</Label>
          <Textarea
            id={`notes-${question.id}`}
            placeholder="Capture observations, strengths, areas to improve"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            minLength={0}
            rows={8}
          />
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Feedback"}
          </Button>
        </div>
      </form>
    </>
  );

  if (hideWrapper) {
    return content;
  }

  return (
    <div className="rounded-lg border p-4 shadow-sm space-y-4">{content}</div>
  );
}
