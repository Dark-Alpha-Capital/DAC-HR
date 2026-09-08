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
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
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
  const [questionTextError, setQuestionTextError] = useState<string | null>(
    null,
  );
  const [optionsErrors, setOptionsErrors] = useState<
    Array<{ message?: string }> | undefined
  >(undefined);

  const resetForm = () => {
    setQuestionText(question.questionText);
    setOptions(initialOptionsFrom(question.questionType, question.options));
    setQuestionTextError(null);
    setOptionsErrors(undefined);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const submitQuestion = async () => {
    const payload: QuestionEditFormSchema = buildQuestionEditPayload({
      questionType,
      questionText,
      options,
    });

    const parsed = questionEditFormSchema.safeParse(payload);
    if (!parsed.success) {
      let nextQuestionTextError: string | undefined;
      const nextOptionsErrors: Array<{ message?: string }> = [];
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "questionText" && !nextQuestionTextError) {
          nextQuestionTextError = issue.message;
        } else if (
          issue.path[0] === "options" &&
          !nextOptionsErrors.some((error) => error.message === issue.message)
        ) {
          nextOptionsErrors.push({ message: issue.message });
        }
      }
      setQuestionTextError(nextQuestionTextError ?? null);
      setOptionsErrors(
        nextOptionsErrors.length > 0 ? nextOptionsErrors : undefined,
      );
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
    if (loading) return;
    await submitQuestion();
  };

  const handleEnterToSubmit = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
      return;
    }

    if (e.target instanceof HTMLTextAreaElement) {
      e.preventDefault();
      if (!loading) {
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
        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 py-4">
            <Field>
              <FieldLabel>Question type</FieldLabel>
              <Badge variant="secondary">
                {getQuestionTypeLabel(question.questionType)}
              </Badge>
            </Field>
            <Field data-invalid={Boolean(questionTextError)}>
              <FieldLabel htmlFor={`edit-question-text-${question.id}`}>
                Question
              </FieldLabel>
              <Textarea
                id={`edit-question-text-${question.id}`}
                value={questionText}
                onChange={(e) => {
                  setQuestionText(e.target.value);
                  if (questionTextError) setQuestionTextError(null);
                }}
                onKeyDown={handleEnterToSubmit}
                placeholder="Enter the question"
                rows={4}
                aria-invalid={Boolean(questionTextError)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter saves. Shift+Enter adds a new line.
              </p>
              {questionTextError ? (
                <FieldError>{questionTextError}</FieldError>
              ) : null}
            </Field>
            {questionType === "mcq" ? (
              <McqOptionsField
                options={options}
                onChange={(nextOptions) => {
                  setOptions(nextOptions);
                  if (optionsErrors) setOptionsErrors(undefined);
                }}
                disabled={loading}
                invalid={Boolean(optionsErrors)}
                errors={optionsErrors}
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
