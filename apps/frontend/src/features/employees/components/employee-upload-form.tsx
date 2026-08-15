import * as React from "react";
import { useTransition, useState, useEffect } from "react";
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
  departmentEnum,
} from "#/features/employees/schemas";
import { createEmployee } from "#/features/employees/server/mutations/create-employee";
import { MarkdownEditor } from "#/components/shared/markdown-editor";
import { cn } from "#/lib/utils";
import * as z from "zod";

const departmentLabels = {
  management: "Management",
  "capital-markets": "Capital Markets",
  "deal-team": "Deal Team",
  legal: "Legal",
  operations: "Operations",
  origination: "Origination",
  pipe: "PIPE",
  "public-markets": "Public Markets",
} satisfies Record<z.infer<typeof departmentEnum>, string>;

const EmployeeUploadForm = ({
  positions,
  candidateId: _candidateId,
  candidateData,
  applicationData,
}: {
  positions: {
    id: string;
    name: string;
  }[];
  candidateId?: string;
  candidateData?: {
    firstName: string;
    lastName: string;
    applications: Array<{
      id: string;
      position: {
        id: string;
        name: string;
      };
    }>;
  } | null;
  applicationData?: {
    id: string;
    position: {
      id: string;
      name: string;
    };
  } | null;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);

  // Pre-fill form with candidate data if available
  const getInitialValues = () => {
    if (candidateData) {
      return {
        firstName: candidateData.firstName || "",
        lastName: candidateData.lastName || "",
        // SAFETY: the form schema requires at least one department value.
        department: [] as z.infer<typeof departmentEnum>[],
        positionId: applicationData?.position.id || "",
        profileImage: "",
        bio: "",
      };
    }
    return {
      firstName: "",
      lastName: "",
      // SAFETY: the form schema requires at least one department value.
      department: [] as z.infer<typeof departmentEnum>[],
      positionId: "",
      profileImage: "",
      bio: "",
    };
  };

  const form = useForm({
    defaultValues: getInitialValues(),
    validators: {
      onSubmit: ({ value }) => {
        const result = employeeFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.format();
        }
        return undefined;
      },
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
              // SAFETY: the upload API returns `{ error }` JSON on failure.
              const errorData = (await uploadResponse.json()) as {
                error?: string;
              };
              throw new Error(errorData.error || "Failed to upload image");
            }

            // SAFETY: the upload API returns `{ url }` JSON on success.
            const { url: fileUrl } = (await uploadResponse.json()) as {
              url: string;
            };
            finalImageUrl = fileUrl;
          }

          // Create the employee with the final image URL
          const result = await createEmployee({
            data: {
              firstName: value.firstName,
              lastName: value.lastName,
              department: value.department,
              positionId: value.positionId || null,
              profileImage: finalImageUrl || null,
              bio: value.bio && value.bio.trim() !== "" ? value.bio : null,
            },
          });

          if (result.error) {
            const errorMessage = z.string().safeParse(result.error);
            toast.error(
              errorMessage.success
                ? errorMessage.data
                : "Failed to create employee",
              {
                position: "bottom-right",
              },
            );
          } else {
            toast.success("Employee created successfully", {
              position: "bottom-right",
              description: "The employee has been created successfully.",
              action: {
                label: "View Employees",
                onClick: () => {
                  router.navigate({
                    to: "/employees",
                    search: { memberType: "all", name: undefined },
                  });
                },
              },
            });
            form.reset();
            setFile(null);
            // Clear file input
            // SAFETY: the file input is rendered with id="image-upload" by
            // this form, so getElementById returns the input element.
            const fileInput = document.getElementById(
              "image-upload",
            ) as HTMLInputElement;
            if (fileInput) {
              fileInput.value = "";
            }
            // Reset bio field
            form.setFieldValue("bio", "");
            router.navigate({
              to: "/employees",
              search: { memberType: "all", name: undefined },
            });
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create employee",
            {
              position: "bottom-right",
            },
          );
        }
      });
    },
  });

  // Update form values when candidateData is available
  useEffect(() => {
    if (candidateData) {
      form.setFieldValue("firstName", candidateData.firstName || "");
      form.setFieldValue("lastName", candidateData.lastName || "");
      if (applicationData?.position.id) {
        form.setFieldValue("positionId", applicationData.position.id);
      }
    }
  }, [candidateData, applicationData, form]);

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
      // SAFETY: the file input is rendered with id="image-upload" by this
      // form, so getElementById returns the input element.
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
            {candidateData
              ? "Add Hired Candidate to Employee Directory"
              : "Add New Employee"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {candidateData
              ? "Complete the employee details below. Basic information has been pre-filled from the candidate profile."
              : "Enter the employee details below to add them to the system."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
              setFile(null);
              // SAFETY: the file input is rendered with id="image-upload" by
              // this form, so getElementById returns the input element.
              const fileInput = document.getElementById(
                "image-upload",
              ) as HTMLInputElement;
              if (fileInput) {
                fileInput.value = "";
              }
              // Reset bio field
              form.setFieldValue("bio", "");
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="employee-upload-form"
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

export default EmployeeUploadForm;
