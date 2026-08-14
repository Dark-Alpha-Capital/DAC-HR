import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { McqOptionsField } from "~/components/forms/mcq-options-field";
import { createQuestion } from "~/lib/actions/create-question";
import {
  questionFormSchema,
  type QuestionFormSchema,
} from "~/lib/schemas/question-form-schema";
import { useQueryInvalidation } from "~/hooks/use-query-invalidation";

interface AddRoundQuestionDialogProps {
  positionId: string;
  positionName: string;
  roundId: string;
  roundName: string;
  onQuestionAdded?: () => void;
  variant?: "header" | "empty-state";
}

const defaultMcqOptions = () => [{ text: "" }, { text: "" }];

export function AddRoundQuestionDialog({
  positionId,
  positionName,
  roundId,
  roundName,
  onQuestionAdded,
  variant = "header",
}: AddRoundQuestionDialogProps) {
  const invalidate = useQueryInvalidation();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [questionType, setQuestionType] = useState<"text" | "mcq">("text");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(defaultMcqOptions);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setQuestionType("text");
    setQuestionText("");
    setOptions(defaultMcqOptions());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const canSubmit = !loading && Boolean(questionText.trim());

  const submitQuestion = async () => {
    const payload: QuestionFormSchema =
      questionType === "mcq"
        ? {
            questionText,
            positionId,
            roundTemplateId: roundId,
            questionType: "mcq",
            options,
          }
        : {
            questionText,
            positionId,
            roundTemplateId: roundId,
            questionType: "text",
          };

    const parsed = questionFormSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Please complete all required fields");
      return;
    }

    setLoading(true);

    try {
      const result = await createQuestion({ data: parsed.data });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to create question",
        );
        return;
      }

      toast.success("Question added");
      handleOpenChange(false);
      await Promise.all([
        invalidate.questionLists(),
        onQuestionAdded?.(),
      ]);
    } catch {
      toast.error("An error occurred while creating the question");
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
        {variant === "empty-state" ? (
          <Button size="sm" variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            Add question
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add question
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[500px]"
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Add question</DialogTitle>
          <DialogDescription>
            Add a question to {roundName} for {positionName}. Press Enter to
            save or Esc to close.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question-type">Question type</Label>
              <Select
                value={questionType}
                onValueChange={(value: "text" | "mcq") => {
                  setQuestionType(value);
                  if (value === "mcq" && options.length < 2) {
                    setOptions(defaultMcqOptions());
                  }
                }}
              >
                <SelectTrigger id="question-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="mcq">Multiple choice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-text">Question</Label>
              <Textarea
                id="question-text"
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
              {loading ? "Saving..." : "Save question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
