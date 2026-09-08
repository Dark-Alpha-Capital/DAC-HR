import * as React from "react";
import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "#/components/ui/input-group";
import { Badge } from "#/components/ui/badge";
import { SubmitButton } from "#/components/shared/submit-button";
import { shouldShowFieldError } from "#/lib/form-feedback";
import { zodFormValidator } from "#/lib/zod-form-validator";
import {
  questionEditFormSchema,
  type QuestionEditFormSchema,
} from "#/features/questions/schemas";
import { patchQuestion } from "#/features/questions/server/mutations/patch-question";
import { useRouter } from "@tanstack/react-router";
import type { Question } from "#/features/questions/types";
import { McqOptionsField } from "#/components/shared/mcq-options-field";
import { getQuestionTypeLabel } from "#/features/questions/helpers";
import {
  buildQuestionEditPayload,
  initialOptionsFrom,
} from "#/features/questions/question-draft";

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
      options: initialOptionsFrom(question.questionType, question.options),
    },
    validators: {
      onBlur: zodFormValidator(questionEditFormSchema),
      onSubmit: zodFormValidator(questionEditFormSchema),
    },
    onSubmit: async ({ value }) => {
      const payload: QuestionEditFormSchema = buildQuestionEditPayload({
        questionType: value.questionType,
        questionText: value.questionText,
        options: value.options,
      });

      startTransition(async () => {
        const result = await patchQuestion({
          data: {
            questionId: question.id,
            formData: payload,
          },
        });
        if ("success" in result && result.success) {
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
            z.string().safeParse(result.error).data ||
              "Failed to update question",
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
          <SubmitButton
            form="question-edit-form"
            loading={isPending}
            loadingLabel="Updating..."
          >
            Update
          </SubmitButton>
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
              const isInvalid = shouldShowFieldError(
                field.state.meta,
                form.state.submissionAttempts,
              );
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
              children={(field) => {
                const isInvalid = shouldShowFieldError(
                  field.state.meta,
                  form.state.submissionAttempts,
                );
                return (
                  <McqOptionsField
                    options={field.state.value}
                    onChange={field.handleChange}
                    disabled={isPending}
                    invalid={isInvalid}
                    errors={field.state.meta.errors}
                  />
                );
              }}
            />
          ) : null}
        </FieldGroup>
      </form>
    </div>
  );
};

export default QuestionEditForm;
