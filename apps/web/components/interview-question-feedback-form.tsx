"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { createInterviewFeedback } from "@/lib/actions/create-interview-feedback";
import { toast } from "sonner";

interface QuestionFeedback {
  id: string;
  questionText: string;
  questionType: string | null;
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
}

export default function InterviewQuestionFeedbackForm({
  interviewId,
  question,
  index,
}: InterviewQuestionFeedbackFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(question.feedback?.notes ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await createInterviewFeedback({
        interviewId,
        questionId: question.id,
        notes: notes.trim() === "" ? undefined : notes.trim(),
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to save feedback"
        );
        return;
      }

      toast.success("Feedback saved");
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border p-4 shadow-sm space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Question {index + 1}
          </p>
          {question.questionType && (
            <span className="text-xs text-muted-foreground uppercase">
              {question.questionType}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {question.questionText}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`notes-${question.id}`}>Notes</Label>
          <Textarea
            id={`notes-${question.id}`}
            placeholder="Capture observations, strengths, areas to improve"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            minLength={0}
          />
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Feedback"}
          </Button>
        </div>
      </form>
    </div>
  );
}
