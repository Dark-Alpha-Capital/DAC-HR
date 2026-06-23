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
import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { MarkdownEditor } from "~/components/markdown-editor";
import { screenerFormSchema } from "~/lib/schemas/screener-form-schema";
import { updateScreenerAction } from "~/lib/actions/update-screener";
import type { Screener } from "@workspace/db/schema";

export default function ScreenerEditForm({ screener }: { screener: Screener }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: screener.name,
      content: screener.content,
    },
    validators: {
      onSubmit: screenerFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await updateScreenerAction({
          data: { id: screener.id, ...value },
        });
        if (result.error) {
          toast.error(
            typeof result.error === "string"
              ? result.error
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
          name="name"
          children={(field) => (
            <Field>
              <FieldLabel htmlFor="screener-name">Name</FieldLabel>
              <Input
                id="screener-name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        />

        <form.Field
          name="content"
          children={(field) => (
            <Field>
              <FieldLabel>Screener criteria (Markdown)</FieldLabel>
              <FieldDescription>
                Define evaluation criteria, scoring dimensions, and what to look
                for when analyzing interviews.
              </FieldDescription>
              <MarkdownEditor
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                minHeight="400px"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  );
}
