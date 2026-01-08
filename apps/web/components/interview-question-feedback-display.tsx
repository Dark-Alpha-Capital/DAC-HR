"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Edit, Plus, ChevronRight, Star } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import EditQuestionFeedbackDialog from "./dialogs/edit-question-feedback-dialog";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasFeedback =
    question.feedback &&
    ((question.feedback.notes && question.feedback.notes.trim() !== "") ||
      question.feedback.rating !== null);

  return (
    <>
      <div
        className={cn(
          "rounded-lg border bg-card transition-colors",
          hasFeedback && "border-l-2 border-l-emerald-500"
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Question number */}
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-relaxed">
                    {question.questionText}
                  </p>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform mt-0.5",
                      isExpanded && "rotate-90"
                    )}
                  />
                </div>
              </button>

              {/* Rating badge inline */}
              {question.feedback?.rating && (
                <Badge
                  variant="secondary"
                  className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs"
                >
                  <Star className="h-3 w-3 fill-current mr-1" />
                  {question.feedback.rating}/5
                </Badge>
              )}

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-4 space-y-3">
                  {hasFeedback ? (
                    <>
                      {question.feedback?.notes &&
                        question.feedback.notes.trim() !== "" && (
                          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                            {question.feedback.notes}
                          </div>
                        )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No feedback yet
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDialogOpen(true);
                    }}
                  >
                    {hasFeedback ? (
                      <>
                        <Edit className="h-3 w-3 mr-1.5" />
                        Edit Feedback
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1.5" />
                        Add Feedback
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditQuestionFeedbackDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        interviewId={interviewId}
        question={question}
        index={index}
      />
    </>
  );
}
