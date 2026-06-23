import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
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
import { createScreenerAction } from "~/lib/actions/create-screener";

export default function ScreenerUploadForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: "",
      content: "",
    },
    validators: {
      onSubmit: screenerFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await createScreenerAction({ data: value });
        if (result.error) {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Failed to create screener",
          );
        } else {
          toast.success("Screener created successfully");
          router.navigate({
            to: "/screeners/$id/edit",
            params: { id: result.data!.id },
          });
          form.reset();
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
                placeholder="e.g. Technical Interview Rubric"
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
                placeholder="# Evaluation criteria&#10;&#10;## Technical depth&#10;- ..."
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
            Creating...
          </>
        ) : (
          "Create Screener"
        )}
      </Button>
    </form>
  );
}
