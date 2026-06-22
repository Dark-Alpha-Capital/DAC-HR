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
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "~/components/ui/input-group";
import { roundEditFormSchema } from "~/lib/schemas/round-form-schema";
import { Loader2 } from "lucide-react";
import { updateRound } from "~/lib/actions/update-round";
import { useRouter } from "@tanstack/react-router";
import type { RoundTemplate } from "@workspace/db/schema";

interface RoundEditFormProps {
  round: RoundTemplate;
}

const RoundEditForm = ({ round }: RoundEditFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: round.name,
      description: round.description || "",
    },
    validators: {
      onSubmit: roundEditFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await updateRound({
          data: [
            round.id,
            {
              name: value.name,
              description: value.description,
            },
          ],
        });
        if (result.success) {
          toast.success("Round updated successfully", {
            position: "bottom-right",
            action: {
              label: "View Round",
              onClick: () => {
                router.navigate({ to: `/rounds/${result.data?.id}` });
              },
            },
          });
          router.navigate({ to: `/rounds/${result.data?.id}` });
        } else {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Failed to update round",
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
          <h2 className="text-2xl font-semibold tracking-tight">Edit Round</h2>
          <p className="text-sm text-muted-foreground">
            Update the round details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset({
                name: round.name,
                description: round.description || "",
              });
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button type="submit" form="round-edit-form" disabled={isPending}>
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
        id="round-edit-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup>
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Round Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter the round name"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="description"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Round Description
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Describe the round in detail."
                      rows={6}
                      className="min-h-24 resize-none"
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {field.state.value.length}/1000 characters
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    Describe the round in detail (optional).
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
      </form>
    </div>
  );
};

export default RoundEditForm;
