import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import InterviewQuestionFeedbackForm from "../interview-question-feedback-form";

interface QuestionFeedback {
  id: string;
  questionText: string;
  feedback: {
    id: string;
    notes: string | null;
    rating: number | null;
  } | null;
}

interface EditQuestionFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  question: QuestionFeedback;
  index: number;
}

export default function EditQuestionFeedbackDialog({
  open,
  onOpenChange,
  interviewId,
  question,
  index,
}: EditQuestionFeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question {index + 1} Feedback</DialogTitle>
          <DialogDescription>
            Update the feedback and notes for this interview question.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="space-y-1 mb-6">
            <p className="text-sm font-semibold text-foreground">
              Question {index + 1}
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {question.questionText}
            </p>
          </div>
          <InterviewQuestionFeedbackForm
            interviewId={interviewId}
            question={question}
            index={index}
            onSuccess={() => onOpenChange(false)}
            hideWrapper={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
