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
import { questionFormSchema } from "@/lib/schemas/question-form-schema";
import { Loader2 } from "lucide-react";
import { updateQuestion } from "@/lib/actions/update-question";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { questionBank } from "@workspace/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

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
      questionType: question.questionType as "behavioral" | "technical" | "skill",
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Question</CardTitle>
        <CardDescription>Update the question details below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="question-edit-form"
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

            <form.Field
              name="questionType"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Question Type</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as "behavioral" | "technical" | "skill")
                      }
                      aria-invalid={isInvalid}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={isInvalid}
                        className="w-full"
                      >
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectSeparator />
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="skill">Skill</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
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
            onClick={() => {
              form.reset({
                questionText: question.questionText,
                questionType: question.questionType as "behavioral" | "technical" | "skill",
              });
            }}
            className="cursor-pointer"
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="question-edit-form"
            className="cursor-pointer"
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
        </Field>
      </CardFooter>
    </Card>
  );
};

export default QuestionEditForm;

