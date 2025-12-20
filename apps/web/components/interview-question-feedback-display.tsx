"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Edit, Plus, ChevronDown, MessageSquare, Star } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);

  const hasFeedback =
    question.feedback &&
    ((question.feedback.notes && question.feedback.notes.trim() !== "") ||
      question.feedback.rating !== null);

  return (
    <>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="rounded-lg border"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CollapsibleTrigger asChild>
                <button className="w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md group hover:bg-muted/50 transition-colors p-2 -m-2">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-sm font-semibold">
                      Question {index + 1}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-all duration-200",
                        isOpen && "transform rotate-180"
                      )}
                    />
                    {hasFeedback && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Has feedback
                      </span>
                    )}
                    {question.feedback?.rating && (
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1"
                      >
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {question.feedback.rating}/5
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {question.questionText}
                  </p>
                  {!isOpen && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronDown className="h-3.5 w-3.5" />
                      <span>Click to {hasFeedback ? "view notes" : "view more"}</span>
                    </div>
                  )}
                  {isOpen && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                      <span>Click to collapse</span>
                    </div>
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
              type="button"
              className="shrink-0"
            >
              {hasFeedback ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feedback
                </>
              )}
            </Button>
          </div>
        </div>

        {hasFeedback && (
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-4 pt-2 border-t">
              {question.feedback?.rating && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Rating:
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-sm font-medium px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1.5"
                    >
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      {question.feedback.rating}/5
                    </Badge>
                  </div>
                </div>
              )}
              {question.feedback?.notes &&
                question.feedback.notes.trim() !== "" && (
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
          </CollapsibleContent>
        )}

        {!hasFeedback && (
          <CollapsibleContent className="px-4 pb-4">
            <div className="pt-2 border-t">
              <div className="text-center py-4 text-sm text-muted-foreground">
                No feedback recorded for this question yet
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>

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
