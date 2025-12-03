"use client";

import * as React from "react";
import { useTransition, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  employeeFormSchema,
  type EmployeeFormSchema,
  departmentEnum,
} from "@/lib/schemas/employee-form-schema";
import { createEmployee } from "@/lib/actions/create-employee";

const EmployeeUploadForm = ({
  positions,
}: {
  positions: {
    id: string;
    name: string;
  }[];
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      department: "engineering" as const,
      positionId: "",
      profileImage: "",
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
              const errorData = await uploadResponse.json();
              throw new Error(errorData.error || "Failed to upload image");
            }

            const { url: fileUrl } = await uploadResponse.json();
            finalImageUrl = fileUrl;
          }

          // Create the employee with the final image URL
          const result = await createEmployee({
            ...value,
            positionId: value.positionId || null,
            profileImage: finalImageUrl || null,
          });

          if (result.error) {
            toast.error(
              typeof result.error === "string"
                ? result.error
                : "Failed to create employee",
              {
                position: "bottom-right",
              }
            );
          } else {
            toast.success("Employee created successfully", {
              position: "bottom-right",
              description: "The employee has been created successfully.",
              action: {
                label: "View Employees",
                onClick: () => {
                  router.push("/employees");
                },
              },
            });
            form.reset();
            setFile(null);
            // Clear file input
            const fileInput = document.getElementById(
              "image-upload"
            ) as HTMLInputElement;
            if (fileInput) {
              fileInput.value = "";
            }
            router.push("/employees");
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create employee",
            {
              position: "bottom-right",
            }
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
        "image-upload"
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
            Add New Employee
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter the employee details below to add them to the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              setFile(null);
              const fileInput = document.getElementById(
                "image-upload"
              ) as HTMLInputElement;
              if (fileInput) {
                fileInput.value = "";
              }
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button type="submit" form="employee-upload-form" disabled={isPending}>
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
        id="employee-upload-form"
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
                      Upload a profile image (max 500MB)
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
                      value={field.state.value}
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
        </FieldGroup>
      </form>
    </div>
  );
};

export default EmployeeUploadForm;
