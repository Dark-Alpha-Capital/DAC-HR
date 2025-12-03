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
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { documentFormSchema } from "@/lib/schemas/document-form-schema";
import { Loader2 } from "lucide-react";
import { createDocument } from "@/lib/actions/create-document";
import { useRouter } from "next/navigation";

const DocumentUploadForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState<string>("");

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "other" as
        | "job-description"
        | "onboarding"
        | "policy"
        | "hr-form"
        | "other",
      url: "",
      tags: [] as string[],
    },
    validators: {
      onSubmit: documentFormSchema,
    },
    onSubmit: async ({ value }) => {
      // Validate that either file or URL is provided
      if (!file && (!value.url || value.url.trim() === "")) {
        toast.error("Please either upload a file or provide a document URL", {
          position: "bottom-right",
        });
        return;
      }

      startTransition(async () => {
        try {
          let finalUrl = value.url;

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
              throw new Error(errorData.error || "Failed to upload file");
            }

            const { url: fileUrl } = await uploadResponse.json();
            finalUrl = fileUrl;
          } else if (value.url && value.url.trim() !== "") {
            // Validate URL format if provided directly
            try {
              new URL(value.url);
            } catch {
              throw new Error("Invalid URL format");
            }
            finalUrl = value.url.trim();
          }

          // Create the document with the final URL
          const result = await createDocument({
            ...value,
            url: finalUrl,
          });

          if (result.success) {
            toast.success("Document uploaded successfully", {
              position: "bottom-right",
              action: {
                label: "View Documents",
                onClick: () => {
                  router.push("/documents");
                },
              },
            });
            form.reset();
            setFile(null);
            setTagsInput("");
            // Clear file input
            const fileInput = document.getElementById(
              "file-upload"
            ) as HTMLInputElement;
            if (fileInput) {
              fileInput.value = "";
            }

            router.push("/documents");
          } else {
            toast.error(
              typeof result.error === "string"
                ? result.error
                : "Failed to upload document",
              {
                position: "bottom-right",
              }
            );
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to upload document",
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
      setFile(selectedFile);
      // Clear URL when file is selected
      form.setFieldValue("url", "");
      // Auto-fill name if empty
      if (!form.state.values.name) {
        form.setFieldValue("name", selectedFile.name);
      }
    }
  };

  const handleUrlChange = (value: string) => {
    form.setFieldValue("url", value);
    // Clear file when URL is entered
    if (value.trim() !== "") {
      setFile(null);
      // Clear file input
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
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
            Upload a file or provide a document URL, then fill in the details
            below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              setFile(null);
              setTagsInput("");
              // Clear file input
              const fileInput = document.getElementById(
                "file-upload"
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
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup>
          <form.Field
            name="url"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <>
                  <Field>
                    <FieldLabel htmlFor="file-upload">Upload File</FieldLabel>
                    <Input
                      id="file-upload"
                      type="file"
                      onChange={handleFileChange}
                      className="cursor-pointer"
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
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="document-url">Document URL</FieldLabel>
                    <Input
                      id="document-url"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="https://example.com/document.pdf"
                      type="url"
                      autoComplete="off"
                      disabled={!!file}
                    />
                    <FieldDescription>
                      Enter a direct URL to the document (file upload will be
                      cleared)
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
            name="category"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        value as
                          | "job-description"
                          | "onboarding"
                          | "policy"
                          | "hr-form"
                          | "other"
                      )
                    }
                    aria-invalid={isInvalid}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectSeparator />
                      <SelectItem value="job-description">
                        Job Description
                      </SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="hr-form">HR Form</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
