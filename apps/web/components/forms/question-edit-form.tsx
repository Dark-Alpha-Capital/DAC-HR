"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { questionFormSchema } from "@/lib/schemas/question-form-schema";
import { Loader2 } from "lucide-react";
import { updateQuestion } from "@/lib/actions/update-question";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { questionBank } from "@workspace/db/schema";

type Question = InferSelectModel<typeof questionBank>;

interface QuestionEditFormProps {
  question: Question;
}

const QuestionEditForm = ({ question }: QuestionEditFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      questionText: question.questionText,
    },
    validators: {
      onSubmit: questionFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await updateQuestion(question.id, value);
        if (result.success) {
          toast.success("Question updated successfully", {
            position: "bottom-right",
            action: {
              label: "View Question",
              onClick: () => {
                router.push(`/questions/${result.data?.id}`);
              },
            },
          });
          router.push(`/questions/${result.data?.id}`);
        } else {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Failed to update question",
            {
              position: "bottom-right",
            }
          );
        }
      });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Edit Question</h2>
          <p className="text-sm text-muted-foreground">
            Update the question details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset({
                questionText: question.questionText,
              });
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="question-edit-form"
            disabled={isPending}
          >
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
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
        </form>
    </div>
  );
};

export default QuestionEditForm;

