import * as React from "react";
import { useTransition, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Loader2, ChevronDown } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import {
  employeeFormSchema,
  type EmployeeFormSchema,
  departmentEnum,
} from "#/features/employees/schemas";
import { updateEmployee } from "#/features/employees/server/mutations/update-employee";
import * as z from "zod";
import EmployeeProfileImage from "./employee-profile-image";
import { MarkdownEditor } from "#/components/shared/markdown-editor";
import { cn } from "#/lib/utils";

interface EmployeeEditFormProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string | string[];
    positionId?: string | null;
    profileImage?: string | null;
    bio?: string | null;
  };
  positions: {
    id: string;
    name: string;
  }[];
}

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

const EmployeeEditForm = ({ employee, positions }: EmployeeEditFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  const form = useForm({
    defaultValues: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: Array.isArray(employee.department)
        ? (employee.department as z.infer<typeof departmentEnum>[])
        : employee.department
          ? [employee.department as z.infer<typeof departmentEnum>]
          : [],
      positionId: employee.positionId,
      profileImage: employee.profileImage,
      bio: employee.bio || "",
    },
    validators: {
      onSubmit: employeeFormSchema as any,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        try {
          let finalImageUrl = value.profileImage;

          // If file is provided, upload it first
          if (file) {
            const formData = new FormData();
            formData.append("file", file);

            const uploadResponse = await fetch("/api/documents/upload", {
              method: "POST",
              body: formData,
            });

            if (!uploadResponse.ok) {
              const errorData = (await uploadResponse.json()) as {
                error?: string;
              };
              throw new Error(errorData.error || "Failed to upload image");
            }

            const { url: fileUrl } = (await uploadResponse.json()) as {
              url: string;
            };
            finalImageUrl = fileUrl;
          }

          // Update the employee with the final image URL
          const result = await updateEmployee({
            data: [
              employee.id,
              {
                firstName: value.firstName,
                lastName: value.lastName,
                department: value.department,
                positionId: value.positionId || null,
                profileImage: finalImageUrl || null,
                bio: value.bio && value.bio.trim() !== "" ? value.bio : null,
              },
            ],
          });

          if (result.error) {
            toast.error(
              typeof result.error === "string"
                ? result.error
                : "Failed to update employee",
              {
                position: "bottom-right",
              },
            );
          } else {
            toast.success("Employee updated successfully", {
              position: "bottom-right",
              description: "The employee has been updated successfully.",
              action: {
                label: "View Employees",
                onClick: () => {
                  router.navigate({ to: "/employees", search: {} as any });
                },
              },
            });
            router.navigate({ to: `/employees/${employee.id}` });
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update employee",
            {
              position: "bottom-right",
            },
          );
        }
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate image file type
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Please select an image file", {
          position: "bottom-right",
        });
        return;
      }
      setFile(selectedFile);
      // Clear URL when file is selected
      form.setFieldValue("profileImage", "");
    }
  };

  const handleUrlChange = (value: string) => {
    form.setFieldValue("profileImage", value);
    // Clear file when URL is entered
    if (value.trim() !== "") {
      setFile(null);
      // Clear file input
      const fileInput = document.getElementById(
        "image-upload",
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Edit Employee
          </h2>
          <p className="text-sm text-muted-foreground">
            Update the employee details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.history.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="employee-edit-form" disabled={isPending}>
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
        id="employee-edit-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup>
          <form.Field
            name="firstName"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>First Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter the first name"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="lastName"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Last Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter the last name"
                    autoComplete="off"
                  />
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
                        variant="secondary"
                        className={cn(
                          "w-full justify-between",
                          !selectedDepartments.length &&
                            "text-muted-foreground",
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
            name="positionId"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Position (Optional)
                  </FieldLabel>
                  <Select
                    value={field.state.value || ""}
                    onValueChange={(value) => {
                      field.handleChange(value);
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select a position (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Link this employee to a position
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="profileImage"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <>
                  {employee.profileImage && !file && (
                    <Field>
                      <FieldLabel>Current Profile Image</FieldLabel>
                      <div className="mt-2">
                        <EmployeeProfileImage
                          imageUrl={employee.profileImage}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="h-32 w-32 rounded-full object-cover"
                        />
                      </div>
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor="image-upload">
                      Profile Image (Optional)
                    </FieldLabel>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <FieldDescription>
                      Upload a new profile image (max 500MB)
                    </FieldDescription>
                    {file && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {file.name} (
                        {file.size > 1024 * 1024
                          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                          : `${(file.size / 1024).toFixed(2)} KB`}
                        )
                      </p>
                    )}
                  </Field>
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Or provide image URL
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Enter image URL (optional)"
                      autoComplete="off"
                    />
                    <FieldDescription>
                      Provide an image URL instead of uploading a file
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                </>
              );
            }}
          />

          <form.Field
            name="bio"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Bio (Optional)</FieldLabel>
                  <MarkdownEditor
                    value={field.state.value || ""}
                    onChange={(value) => {
                      // Ensure we always pass a string, even if empty
                      field.handleChange(value || "");
                    }}
                    error={isInvalid}
                    placeholder="Enter a detailed bio for this employee..."
                    minHeight="200px"
                  />
                  <FieldDescription>
                    Add a detailed bio for this employee. Supports Markdown.
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

export default EmployeeEditForm;
