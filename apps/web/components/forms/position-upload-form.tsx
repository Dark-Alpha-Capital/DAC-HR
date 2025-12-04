"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { positionFormSchema } from "@/lib/schemas/position-form-schema";
import { Loader2 } from "lucide-react";
import { createPosition } from "@/lib/actions/create-position";
import { useRouter } from "next/navigation";
import { RichTextEditorField } from "@/components/rich-text-editor";

const PositionUploadForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      department: "management" as z.infer<
        typeof positionFormSchema
      >["department"],
    },

    validators: {
      onSubmit: positionFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await createPosition(value);
        if (result.success) {
          toast("Position uploaded successfully", {
            position: "bottom-right",
            action: {
              label: "View Position",
              onClick: () => {
                router.push(`/positions/${result.data?.slug}`);
              },
            },
          });
          form.reset();
          router.push(`/positions/${result.data?.slug}`);
        } else {
          toast((result.error as string) || "Failed to upload position", {
            position: "bottom-right",
          });
        }
      });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Add New Position
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter the position details below to add it to the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            form="position-upload-form"
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
      <form
        id="position-upload-form"
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
                  <FieldLabel htmlFor={field.name}>Position Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value as z.infer<
                          typeof positionFormSchema
                        >["department"]
                      )
                    }
                    aria-invalid={isInvalid}
                    placeholder="Enter the position name"
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
                    Position Description
                  </FieldLabel>
                  <RichTextEditorField
                    value={field.state.value}
                    onValueChange={(html) => field.handleChange(html)}
                    error={isInvalid}
                    minHeight="240px"
                    placeholder="Describe the position in detail."
                  />
                  <FieldDescription>
                    Add the job description with rich formatting.
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="department"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Department</FieldLabel>
                  <select
                    id={field.name}
                    name={field.name}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={field.state.value || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value as typeof field.state.value
                      )
                    }
                    aria-invalid={isInvalid}
                  >
                    <option value="management">Management</option>
                    <option value="capital-markets">Capital Markets</option>
                    <option value="deal-team">Deal Team</option>
                    <option value="legal-operations">Legal Operations</option>
                    <option value="origination-pipe-public-markets">
                      Origination / PIPE / Public Markets
                    </option>
                  </select>
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

export default PositionUploadForm;
