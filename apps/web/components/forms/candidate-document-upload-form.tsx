"use client";

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
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth-client";
import { resetCacheForCandidateDocuments } from "@/lib/actions/reset-cache";

const CandidateDocumentUploadForm = ({
  candidateId,
}: {
  candidateId: string;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session } = authClient.useSession();
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState<string>("");

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "other" as "resume" | "cover-letter" | "portfolio" | "other",
      tags: [] as string[],
    },
    onSubmit: async ({ value }) => {
      if (!file) {
        toast.error("Please upload a file");
        return;
      }

      if (!session?.session?.token) {
        toast.error("You must be logged in to upload a document");
        return;
      }

      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.append("name", value.name);
          if (value.description) {
            formData.append("description", value.description);
          }
          formData.append("category", value.category);
          formData.append("file", file);
          if (value.tags && value.tags.length > 0) {
            formData.append("tags", JSON.stringify(value.tags));
          }

          const response = await fetch(
            `/api/candidate/${candidateId}/documents`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.session.token}`,
              },
              body: formData,
            }
          );

          const result = await response.json();

          if (!response.ok) {
            const errorMessage =
              typeof result.error === "string"
                ? result.error
                : typeof result.error === "object"
                  ? JSON.stringify(result.error)
                  : "Failed to upload document";
            toast.error(errorMessage);
            return;
          }

          if (result.success) {
            toast.success("Document uploaded successfully");
            await resetCacheForCandidateDocuments(candidateId);
            form.reset();
            setFile(null);
            setTagsInput("");
            const fileInput = document.getElementById(
              "file-upload"
            ) as HTMLInputElement;
            if (fileInput) fileInput.value = "";
            router.push(`/candidates/${candidateId}`);
          } else {
            const errorMessage =
              typeof result.error === "string"
                ? result.error
                : "Failed to upload document";
            toast.error(errorMessage);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to upload document";
          toast.error(errorMessage);
        }
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!form.state.values.name) {
        form.setFieldValue("name", selectedFile.name);
      }
    }
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tagsArray = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    form.setFieldValue("tags", tagsArray);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Upload Candidate Document
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload a file and fill in the details below.
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
              const fileInput = document.getElementById(
                "file-upload"
              ) as HTMLInputElement;
              if (fileInput) fileInput.value = "";
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="candidate-document-upload-form"
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
        id="candidate-document-upload-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="file-upload">Document File</FieldLabel>
            <div className="rounded-lg border p-4">
              <div className="space-y-2.5">
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  All file types accepted except videos (max 500MB)
                </p>
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} (
                    {file.size > 1024 * 1024
                      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(file.size / 1024).toFixed(2)} KB`}
                    )
                  </p>
                )}
              </div>
            </div>
          </Field>

          <form.Field
            name="name"
            children={(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Document Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter document name"
                  autoComplete="off"
                />
              </Field>
            )}
          />

          <form.Field
            name="description"
            children={(field) => (
              <Field>
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
                  />
                  <InputGroupAddon align="block-end">
                    <InputGroupText className="tabular-nums">
                      {field.state.value.length}/1000 characters
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            )}
          />

          <form.Field
            name="category"
            children={(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(
                      value as "resume" | "cover-letter" | "portfolio" | "other"
                    )
                  }
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectSeparator />
                    <SelectItem value="resume">Resume</SelectItem>
                    <SelectItem value="cover-letter">Cover Letter</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <form.Field
            name="tags"
            children={(field) => (
              <Field>
                <FieldLabel htmlFor="tags-input">Tags</FieldLabel>
                <Input
                  id="tags-input"
                  value={tagsInput}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="Enter tags separated by commas (e.g., important, resume, 2024)"
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
            )}
          />
        </FieldGroup>
      </form>
    </div>
  );
};

export default CandidateDocumentUploadForm;
