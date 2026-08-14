import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
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
import { Loader2 } from "lucide-react";
import { MarkdownEditor } from "#/components/shared/markdown-editor";
import { screenerFormSchema } from "#/features/screeners/schemas";
import { createScreenerAction } from "#/features/screeners/server/mutations/create-screener";

interface ScreenerUploadFormProps {
  positions: Array<{ id: string; name: string }>;
}

export default function ScreenerUploadForm({
  positions,
}: ScreenerUploadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: "",
      content: "",
      positionId: "",
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
          name="positionId"
          children={(field) => (
            <Field>
              <FieldLabel htmlFor="screener-position">Position</FieldLabel>
              <FieldDescription>
                Attach this screener to a specific position. A position can have
                only one screener, and it is used automatically when that
                position&apos;s interview completes.
              </FieldDescription>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger id="screener-position">
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        />

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
