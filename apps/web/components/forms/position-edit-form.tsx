"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { positionFormSchema } from "@/lib/schemas/position-form-schema";
import { Loader2 } from "lucide-react";
import { updatePosition } from "@/lib/actions/update-position";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { position } from "@workspace/db/schema";

type Position = InferSelectModel<typeof position>;

interface PositionEditFormProps {
  position: Position;
}

const PositionEditForm = ({ position }: PositionEditFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: position.name,
      description: position.description || "",
    },
    validators: {
      onSubmit: positionFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await updatePosition(position.id, value);
        if (result.success) {
          toast("Position updated successfully", {
            position: "bottom-right",
            action: {
              label: "View Position",
              onClick: () => {
                router.push(`/positions/${result.data?.slug}`);
              },
            },
          });
          router.push(`/positions/${result.data?.slug}`);
        } else {
          toast("Failed to update position", {
            position: "bottom-right",
          });
        }
      });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Edit Position</h2>
        <p className="text-sm text-muted-foreground">
          Update the position details below.
        </p>
      </div>
      <form
        id="position-edit-form"
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
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Describe the position in detail."
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
                    Describe the position in detail.
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
          onClick={() => {
            form.reset({
              name: position.name,
              description: position.description || "",
            });
          }}
          disabled={isPending}
        >
          Reset
        </Button>
        <Button type="submit" form="position-edit-form" disabled={isPending}>
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
  );
};

export default PositionEditForm;
