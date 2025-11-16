"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
                  label: "View Round",
                  onClick: () => {
                    router.push(onSuccessRedirect);
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add New Question</CardTitle>
        <CardDescription>
          Enter the question details below to add it to the question bank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="question-upload-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
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
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            className="cursor-pointer"
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="question-upload-form"
            className="cursor-pointer"
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
        </Field>
      </CardFooter>
    </Card>
  );
};

export default QuestionUploadForm;
