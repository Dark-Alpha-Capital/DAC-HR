import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { Badge } from "#/components/ui/badge";
import { McqOptionsField } from "#/components/shared/mcq-options-field";
import { patchQuestion } from "#/features/questions/server/mutations/patch-question";
import {
  questionEditFormSchema,
  type QuestionEditFormSchema,
} from "#/features/questions/schemas";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import { getQuestionTypeLabel } from "#/features/questions/helpers";
import {
  buildQuestionEditPayload,
  initialOptionsFrom,
} from "#/features/questions/question-draft";
import type { QuestionOption } from "#/lib/question-types";

type RoundQuestion = {
  id: string;
  questionText: string;
  questionType: string;
  options: QuestionOption[] | null;
};

interface EditRoundQuestionDialogProps {
  question: RoundQuestion;
  onQuestionUpdated?: () => void;
}

export function EditRoundQuestionDialog({
  question,
  onQuestionUpdated,
}: EditRoundQuestionDialogProps) {
  const invalidate = useQueryInvalidation();
  const formRef = useRef<HTMLFormElement>(null);
  const questionType =
    question.questionType === "mcq" ? ("mcq" as const) : ("text" as const);

  const [open, setOpen] = useState(false);
  const [questionText, setQuestionText] = useState(question.questionText);
  const [options, setOptions] = useState(() =>
    initialOptionsFrom(question.questionType, question.options),
  );
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setQuestionText(question.questionText);
    setOptions(initialOptionsFrom(question.questionType, question.options));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const canSubmit = !loading && Boolean(questionText.trim());

  const submitQuestion = async () => {
    const payload: QuestionEditFormSchema = buildQuestionEditPayload({
      questionType,
      questionText,
      options,
    });

    const parsed = questionEditFormSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Please complete all required fields");
      return;
    }

    setLoading(true);

    try {
      const result = await patchQuestion({
        data: {
          questionId: question.id,
          formData: parsed.data,
        },
      });

      if (result.error) {
        const errorMessage = z.string().safeParse(result.error);
        toast.error(
          errorMessage.success
            ? errorMessage.data
            : "Failed to update question",
        );
        return;
      }

      toast.success("Question updated");
      handleOpenChange(false);
      await Promise.all([invalidate.questionLists(), onQuestionUpdated?.()]);
    } catch {
      toast.error("An error occurred while updating the question");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await submitQuestion();
  };

  const handleEnterToSubmit = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
      return;
    }

    if (e.target instanceof HTMLTextAreaElement) {
      e.preventDefault();
      if (canSubmit) {
        formRef.current?.requestSubmit();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="h-7 w-7 p-0">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit question</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[500px]"
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Edit question</DialogTitle>
          <DialogDescription>
            Update this question. Press Enter to save or Esc to close.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question type</Label>
              <Badge variant="secondary">
                {getQuestionTypeLabel(question.questionType)}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-question-text-${question.id}`}>
                Question
              </Label>
              <Textarea
                id={`edit-question-text-${question.id}`}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={handleEnterToSubmit}
                placeholder="Enter the question"
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter saves. Shift+Enter adds a new line.
              </p>
            </div>
            {questionType === "mcq" ? (
              <McqOptionsField
                options={options}
                onChange={setOptions}
                disabled={loading}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
