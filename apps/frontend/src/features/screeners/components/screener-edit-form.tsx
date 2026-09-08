import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { SubmitButton } from "#/components/shared/submit-button";
import { shouldShowFieldError } from "#/lib/form-feedback";
import { zodFormValidator } from "#/lib/zod-form-validator";
import { MarkdownEditor } from "#/components/shared/markdown-editor";
import { screenerEditSchema } from "#/features/screeners/schemas";
import { updateScreenerAction } from "#/features/screeners/server/mutations/update-screener";
import type { Screener } from "#/features/screeners/types";

interface ScreenerEditFormProps {
  screener: Screener & { position?: { id: string; name: string } | null };
  positions: Array<{ id: string; name: string }>;
}

export default function ScreenerEditForm({
  screener,
  positions,
}: ScreenerEditFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: screener.name,
      content: screener.content,
      positionId: screener.positionId ?? "",
    },
    validators: {
      onBlur: zodFormValidator(screenerEditSchema),
      onSubmit: zodFormValidator(screenerEditSchema),
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await updateScreenerAction({
          data: { id: screener.id, ...value },
        });
        if (result.error) {
          const parsedError = z.string().safeParse(result.error);
          toast.error(
            parsedError.success
              ? parsedError.data
              : "Failed to update screener",
          );
        } else {
          toast.success("Screener updated successfully");
        }
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="max-w-4xl space-y-6"
    >
      <FieldGroup>
        <form.Field
          name="positionId"
          children={(field) => {
            const isInvalid = shouldShowFieldError(
              field.state.meta,
              form.state.submissionAttempts,
            );
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="screener-position">Position</FieldLabel>
                <FieldDescription>
                  Attach this screener to a specific position. A position can
                  have only one screener, and it is used automatically when that
                  position&apos;s interview completes.
                </FieldDescription>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                >
                  <SelectTrigger
                    id="screener-position"
                    aria-invalid={isInvalid}
                  >
                    <SelectValue placeholder="No position (manual selection only)" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        <form.Field
          name="name"
          children={(field) => {
            const isInvalid = shouldShowFieldError(
              field.state.meta,
              form.state.submissionAttempts,
            );
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="screener-name">Name</FieldLabel>
                <Input
                  id="screener-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        <form.Field
          name="content"
          children={(field) => {
            const isInvalid = shouldShowFieldError(
              field.state.meta,
              form.state.submissionAttempts,
            );
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel>Screener criteria (Markdown)</FieldLabel>
                <FieldDescription>
                  Define evaluation criteria, scoring dimensions, and what to
                  look for when analyzing interviews.
                </FieldDescription>
                <MarkdownEditor
                  value={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                  error={isInvalid}
                  minHeight="400px"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>

      <SubmitButton loading={isPending} loadingLabel="Saving...">
        Save Changes
      </SubmitButton>
    </form>
  );
}
