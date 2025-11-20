"use client";

import * as React from "react";
import { useTransition, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
import { updateEmployee } from "@/lib/actions/update-employee";
import * as z from "zod";
import EmployeeProfileImage from "../employee-profile-image";

interface EmployeeEditFormProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    positionId?: string | null;
    profileImage?: string | null;
  };
  positions: {
    id: string;
    name: string;
  }[];
}

const EmployeeEditForm = ({ employee, positions }: EmployeeEditFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  const form = useForm({
    defaultValues: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: employee.department as z.infer<typeof departmentEnum>,
      positionId: employee.positionId || "",
      profileImage: employee.profileImage || "",
    },
    validators: {
      onSubmit: employeeFormSchema,
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

          // Update the employee with the final image URL
          const result = await updateEmployee(employee.id, {
            ...value,
            positionId: value.positionId || undefined,
            profileImage: finalImageUrl || undefined,
          });

          if (result.error) {
            toast.error(
              typeof result.error === "string"
                ? result.error
                : "Failed to update employee",
              {
                position: "bottom-right",
              }
            );
          } else {
            toast.success("Employee updated successfully", {
              position: "bottom-right",
              description: "The employee has been updated successfully.",
              action: {
                label: "View Employees",
                onClick: () => {
                  router.push("/employees");
                },
              },
            });
            router.push("/employees");
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update employee",
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Employee</CardTitle>
        <CardDescription>
          Update the employee details below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="employee-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
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
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
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
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
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
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
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
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
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
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="cursor-pointer"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="employee-edit-form"
            className="cursor-pointer"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update"
            )}
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
};

export default EmployeeEditForm;

