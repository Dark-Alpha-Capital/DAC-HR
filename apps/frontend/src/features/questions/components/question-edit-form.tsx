import * as React from "react";
import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "~/components/ui/input-group";
import { Badge } from "~/components/ui/badge";
import {
  questionEditFormSchema,
  type QuestionEditFormSchema,
} from "~/lib/schemas/question-form-schema";
import { Loader2 } from "lucide-react";
import { patchQuestion } from "~/lib/actions/patch-question";
import { useRouter } from "@tanstack/react-router";
import type { Question } from "@workspace/db/schema";
import { McqOptionsField } from "~/components/forms/mcq-options-field";
import { getQuestionTypeLabel } from "~/lib/question-type-label";

interface QuestionEditFormProps {
  question: Question;
}

const QuestionEditForm = ({ question }: QuestionEditFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const questionType =
    question.questionType === "mcq" ? ("mcq" as const) : ("text" as const);

  const form = useForm({
    defaultValues: {
      questionText: question.questionText,
      questionType,
      options:
        questionType === "mcq"
          ? (question.options ?? [{ id: crypto.randomUUID(), text: "" }, { id: crypto.randomUUID(), text: "" }]).map(
              (option) => ({
                id: option.id,
                text: option.text,
              }),
            )
          : [{ text: "" }, { text: "" }],
    },
    onSubmit: async ({ value }) => {
      const payload: QuestionEditFormSchema =
        value.questionType === "mcq"
          ? {
              questionText: value.questionText,
              questionType: "mcq",
              options: value.options,
            }
          : {
              questionText: value.questionText,
              questionType: "text",
            };

      const parsed = questionEditFormSchema.safeParse(payload);
      if (!parsed.success) {
        toast.error("Please fix the form errors", { position: "bottom-right" });
        return;
      }

      startTransition(async () => {
        const result = await patchQuestion({
          data: {
            questionId: question.id,
            formData: parsed.data,
          },
        });
        if (result.success) {
          toast.success("Question updated successfully", {
            position: "bottom-right",
            action: {
              label: "View Question",
              onClick: () => {
                router.navigate({ to: `/questions/${result.data?.id}` });
              },
            },
          });
          router.navigate({ to: `/questions/${result.data?.id}` });
        } else {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Failed to update question",
            {
              position: "bottom-right",
            },
          );
        }
      });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Edit Question
          </h2>
          <p className="text-sm text-muted-foreground">
            Update the question details below.
          </p>
          <Badge variant="secondary">
            {getQuestionTypeLabel(question.questionType)}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button type="submit" form="question-edit-form" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update"
            )}
          </Button>
        </div>
      </div>
      <form
        id="question-edit-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup>
          <Field>
            <FieldLabel>Question type</FieldLabel>
            <FieldDescription>
              Question type cannot be changed after creation.
            </FieldDescription>
            <Badge variant="secondary">
              {getQuestionTypeLabel(question.questionType)}
            </Badge>
          </Field>

          <form.Field
            name="questionText"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Question Text</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter the question text"
                      rows={6}
                      className="min-h-24 resize-none"
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {field.state.value.length}/500 characters
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          {questionType === "mcq" ? (
            <form.Field
              name="options"
              children={(field) => (
                <McqOptionsField
                  options={field.state.value}
                  onChange={field.handleChange}
                  disabled={isPending}
                />
              )}
            />
          ) : null}
        </FieldGroup>
      </form>
    </div>
  );
};

export default QuestionEditForm;
