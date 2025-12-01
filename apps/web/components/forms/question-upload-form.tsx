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
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { questionFormSchema } from "@/lib/schemas/question-form-schema";
import {
  createQuestion,
  createQuestionForRound,
} from "@/lib/actions/create-question";

interface QuestionUploadFormProps {
  roundId?: string;
  onSuccessRedirect?: string;
}

const QuestionUploadForm = ({
  roundId,
  onSuccessRedirect,
}: QuestionUploadFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      questionText: "",
    },
    validators: {
      onSubmit: questionFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = roundId
          ? await createQuestionForRound(value, roundId)
          : await createQuestion(value);

        if (result.error) {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Failed to create question",
            {
              position: "bottom-right",
            }
          );
        } else {
          toast.success("Question created successfully", {
            position: "bottom-right",
            description: roundId
              ? "The question has been added to this round."
              : "The question has been added to the question bank.",
            action: onSuccessRedirect
              ? {
                  label: "View Round Questions",
                  onClick: () => {
                    router.push(`/rounds/${roundId}`);
                  },
                }
              : {
                  label: "View Questions",
                  onClick: () => {
                    router.push("/questions");
                  },
                },
          });
          form.reset();
        }
      });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Add New Question</h2>
        <p className="text-sm text-muted-foreground">
          Enter the question details below to add it to the question bank.
        </p>
      </div>
      <form
        id="question-upload-form"
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="question-upload-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
    </div>
  );
};

export default QuestionUploadForm;
