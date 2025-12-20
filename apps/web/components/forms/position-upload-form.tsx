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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  positionFormSchema,
  hireLevelEnum,
  positionStatusEnum,
} from "@/lib/schemas/position-form-schema";
import { departmentEnum } from "@/lib/schemas/employee-form-schema";
import { Loader2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { createPosition } from "@/lib/actions/create-position";
import { useRouter } from "next/navigation";
import { RichTextEditorField } from "@/components/rich-text-editor";
import { cn } from "@workspace/ui/lib/utils";

const departmentLabels: Record<z.infer<typeof departmentEnum>, string> = {
  management: "Management",
  "capital-markets": "Capital Markets",
  "deal-team": "Deal Team",
  legal: "Legal",
  operations: "Operations",
  origination: "Origination",
  pipe: "PIPE",
  "public-markets": "Public Markets",
};

const hireLevelLabels: Record<z.infer<typeof hireLevelEnum>, string> = {
  "managing-director": "Managing Director",
  "vice-president": "Vice President",
  associate: "Associate",
  analyst: "Analyst",
  intern: "Intern",
};

const statusLabels: Record<z.infer<typeof positionStatusEnum>, string> = {
  active: "Active",
  hold: "Hold",
  passed: "Passed",
  upcoming: "Upcoming",
};

const PositionUploadForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      department: [] as z.infer<typeof positionFormSchema>["department"],
      hireLevel: undefined as z.infer<typeof positionFormSchema>["hireLevel"],
      status: "active" as z.infer<typeof positionFormSchema>["status"],
    },

    validators: {
      onSubmit: positionFormSchema as any,
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
              const selectedDepartments = field.state.value || [];
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Department</FieldLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        id={field.name}
                        variant="outline"
                        className={cn(
                          "w-full justify-between",
                          !selectedDepartments.length && "text-muted-foreground"
                        )}
                        aria-invalid={isInvalid}
                      >
                        {selectedDepartments.length > 0
                          ? `${selectedDepartments.length} department${
                              selectedDepartments.length > 1 ? "s" : ""
                            } selected`
                          : "Select departments"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full" align="start">
                      <DropdownMenuLabel>Select Departments</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {departmentEnum.options.map((dept) => (
                        <DropdownMenuCheckboxItem
                          key={dept}
                          checked={selectedDepartments.includes(dept)}
                          onCheckedChange={(checked) => {
                            const current = selectedDepartments;
                            const updated = checked
                              ? [...current, dept]
                              : current.filter((d) => d !== dept);
                            field.handleChange(updated);
                          }}
                        >
                          {departmentLabels[dept]}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedDepartments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedDepartments.map((dept) => (
                        <span
                          key={dept}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        >
                          {departmentLabels[dept]}
                        </span>
                      ))}
                    </div>
                  )}
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="hireLevel"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Hire Level</FieldLabel>
                  <Select
                    value={field.state.value || ""}
                    onValueChange={(value) =>
                      field.handleChange(
                        value === ""
                          ? undefined
                          : (value as z.infer<typeof hireLevelEnum>)
                      )
                    }
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className={cn(
                        !field.state.value && "text-muted-foreground"
                      )}
                    >
                      <SelectValue placeholder="Select hire level" />
                    </SelectTrigger>
                    <SelectContent>
                      {hireLevelEnum.options.map((level) => (
                        <SelectItem key={level} value={level}>
                          {hireLevelLabels[level]}
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
            name="status"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                  <Select
                    value={field.state.value || "active"}
                    onValueChange={(value) =>
                      field.handleChange(
                        value as z.infer<typeof positionStatusEnum>
                      )
                    }
                  >
                    <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {positionStatusEnum.options.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
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

export default PositionUploadForm;
