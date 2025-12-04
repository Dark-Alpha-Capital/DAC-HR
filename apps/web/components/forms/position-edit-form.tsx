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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { positionFormSchema } from "@/lib/schemas/position-form-schema";
import { departmentEnum } from "@/lib/schemas/employee-form-schema";
import { Loader2 } from "lucide-react";
import { updatePosition } from "@/lib/actions/update-position";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { position } from "@workspace/db/schema";
import { RichTextEditorField } from "@/components/rich-text-editor";

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
      department: (position.department as any) || "engineering",
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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Edit Position</h2>
          <p className="text-sm text-muted-foreground">
            Update the position details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset({
                name: position.name,
                description: position.description || "",
                department: (position.department as any) || "engineering",
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
                  <RichTextEditorField
                    value={field.state.value}
                    onValueChange={(html) => field.handleChange(html)}
                    error={isInvalid}
                    minHeight="240px"
                    placeholder="Describe the position in detail."
                  />
                  <FieldDescription>
                    Describe the position in detail.
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
                  <Select
                    value={field.state.value || ""}
                    onValueChange={(value) => {
                      field.handleChange(value as typeof field.state.value);
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentEnum.options.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept.charAt(0).toUpperCase() +
                            dept.slice(1).replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

export default PositionEditForm;
