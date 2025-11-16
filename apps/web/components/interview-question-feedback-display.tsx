"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { Edit, Plus } from "lucide-react";
import InterviewQuestionFeedbackForm from "./interview-question-feedback-form";

interface QuestionFeedback {
  id: string;
  questionText: string;
  feedback: {
    id: string;
    notes: string | null;
    rating: number | null;
  } | null;
}

interface InterviewQuestionFeedbackDisplayProps {
  interviewId: string;
  question: QuestionFeedback;
  index: number;
}

export default function InterviewQuestionFeedbackDisplay({
  interviewId,
  question,
  index,
}: InterviewQuestionFeedbackDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when feedback data changes (after successful save)
  useEffect(() => {
    setIsEditing(false);
  }, [question.feedback?.id, question.feedback?.notes]);

  const hasFeedback =
    question.feedback &&
    question.feedback.notes &&
    question.feedback.notes.trim() !== "";

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Question {index + 1}</h4>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
        <InterviewQuestionFeedbackForm
          interviewId={interviewId}
          question={question}
          index={index}
        />
      </div>
    );
  }

  if (!hasFeedback) {
    return (
      <div className="rounded-lg border p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                Question {index + 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feedback
            </Button>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {question.questionText}
          </p>
        </div>
        <div className="text-center py-4 text-sm text-muted-foreground">
          No feedback recorded for this question yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Question {index + 1}</span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {question.questionText}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <Separator />

      <div className="space-y-3">
        {question.feedback?.notes && question.feedback.notes.trim() !== "" && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Notes:
            </span>
            <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/50 p-3 rounded-md">
              {question.feedback.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
