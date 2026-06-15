import * as React from "react";
import { useTransition, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { createDocument } from "@/lib/actions/create-document";
import { useRouter } from "@tanstack/react-router";
import type { DocumentCategory } from "@workspace/db/schema";
import * as z from "zod";

// Form validation schema (without url - it's added after file upload)
const formValidationSchema = z.object({
  name: z
    .string()
    .min(1, "Document name is required.")
    .max(255, "Document name must be at most 255 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters."),
  categoryIds: z.array(z.string()).min(1, "At least one category is required."),
  tags: z.array(z.string()),
});

interface DocumentUploadFormProps {
  categories: DocumentCategory[];
}

const DocumentUploadForm = ({ categories }: DocumentUploadFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState<string>("");

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryIds: [] as string[],
      tags: [] as string[],
    },
    validators: {
      onSubmit: formValidationSchema,
    },
    onSubmit: async ({ value }) => {
      console.log("onSubmit handler called", { value, file });

      // Validate that file is provided
      if (!file) {
        toast.error("Please upload a file", {
          position: "bottom-right",
        });
        return;
      }

      // Validate form values
      const validationResult = formValidationSchema.safeParse(value);
      if (!validationResult.success) {
        console.log("Validation failed", validationResult.error);
        const errors = validationResult.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        toast.error(firstError || "Please check the form for errors", {
          position: "bottom-right",
        });
        return;
      }

      console.log("Validation passed, starting file upload");

      startTransition(async () => {
        try {
          // Upload file first
          const formData = new FormData();
          formData.append("file", file);

          const uploadResponse = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || "Failed to upload file");
          }

          const { url: fileUrl } = await uploadResponse.json();

          // Create the document with the uploaded file URL
          const result = await createDocument({
            data: {
              ...value,
              url: fileUrl,
            },
          });

          if (result.success) {
            toast.success("Document uploaded successfully", {
              position: "bottom-right",
              action: {
                label: "View Documents",
                onClick: () => {
                  router.navigate({ to: "/documents", search: {} as any });
                },
              },
            });
            form.reset();
            setFile(null);
            setTagsInput("");
            // Clear file input
            const fileInput = document.getElementById(
              "file-upload",
            ) as HTMLInputElement;
            if (fileInput) {
              fileInput.value = "";
            }

            router.navigate({ to: "/documents", search: {} as any });
          } else {
            toast.error(
              typeof result.error === "string"
                ? result.error
                : "Failed to upload document",
              {
                position: "bottom-right",
              },
            );
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to upload document",
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
      setFile(selectedFile);
      // Auto-fill name if empty
      if (!form.state.values.name) {
        form.setFieldValue("name", selectedFile.name);
      }
    }
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    // Parse tags on the fly but keep raw input for display
    const tagsArray = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    form.setFieldValue("tags", tagsArray);
  };

  const handleTagsBlur = () => {
    // Ensure tags are properly formatted on blur
    const tagsArray = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    form.setFieldValue("tags", tagsArray);
    // Update input to show cleaned version
    setTagsInput(tagsArray.join(", "));
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Upload Document
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload a file and fill in the details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
              setFile(null);
              setTagsInput("");
              // Clear file input
              const fileInput = document.getElementById(
                "file-upload",
              ) as HTMLInputElement;
              if (fileInput) {
                fileInput.value = "";
              }
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="document-upload-form"
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
        id="document-upload-form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Form submitted, calling handleSubmit");
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="file-upload">Upload File</FieldLabel>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="cursor-pointer"
              required
            />
            <FieldDescription>
              All file types accepted except videos (max 500MB)
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

          <form.Field
            name="name"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Document Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter document name"
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
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter document description (optional)"
                      rows={4}
                      className="min-h-20 resize-none"
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {field.state.value.length}/1000 characters
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="categoryIds"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Categories</FieldLabel>
                  {categories.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No categories available. Please create categories first.
                    </div>
                  ) : (
                    <div className="space-y-2 border rounded-md p-4">
                      {categories.map((category) => {
                        const isChecked = field.state.value.includes(
                          category.id,
                        );
                        return (
                          <div
                            key={category.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const currentIds = field.state.value;
                                if (checked) {
                                  field.handleChange([
                                    ...currentIds,
                                    category.id,
                                  ]);
                                } else {
                                  field.handleChange(
                                    currentIds.filter(
                                      (id) => id !== category.id,
                                    ),
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`category-${category.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {category.name}
                              {category.description && (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  - {category.description}
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <FieldDescription>
                    Select one or more categories for this document
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="tags"
            children={(field) => {
              return (
                <Field>
                  <FieldLabel htmlFor="tags-input">Tags</FieldLabel>
                  <Input
                    id="tags-input"
                    value={tagsInput}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    onBlur={handleTagsBlur}
                    placeholder="Enter tags separated by commas (e.g., important, policy, 2024)"
                    autoComplete="off"
                  />
                  <FieldDescription>
                    Separate multiple tags with commas
                  </FieldDescription>
                  {field.state.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.state.value.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
              );
            }}
          />
        </FieldGroup>
      </form>
    </div>
  );
};

export default DocumentUploadForm;
