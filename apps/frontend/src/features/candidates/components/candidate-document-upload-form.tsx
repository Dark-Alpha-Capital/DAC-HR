import { useRef, useTransition, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "#/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

type DocumentCategory = "resume" | "cover-letter" | "portfolio" | "other";

const CandidateDocumentUploadForm = ({
  candidateId,
  compact = false,
  onSuccess,
}: {
  candidateId: string;
  compact?: boolean;
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      // SAFETY: the document category field is one of the four DocumentCategory
      // literals; "other" is the default and a member of that union.
      category: "other" as DocumentCategory,
      // SAFETY: the tags field starts empty; this widens the literal `[]` to
      // the string[] the field is meant to hold.
      tags: [] as string[],
    },
    onSubmit: async ({ value }) => {
      if (!file) {
        toast.error("Please upload a file");
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
              body: formData,
            },
          );

          // SAFETY: the candidate-documents API serializes { success?, error? }
          // on every response; `error` is a string message or a validation
          // object (parsed below with zod).
          const result = (await response.json()) as {
            success?: boolean;
            error?: unknown;
          };

          if (!response.ok) {
            const stringError = z.string().safeParse(result.error);
            const objectError = z
              .record(z.string(), z.unknown())
              .safeParse(result.error);
            const errorMessage = stringError.success
              ? stringError.data
              : objectError.success
                ? JSON.stringify(objectError.data)
                : "Failed to upload document";
            toast.error(errorMessage);
            return;
          }

          if (result.success) {
            toast.success("Document uploaded successfully");
            form.reset();
            setFile(null);
            setTagsInput("");
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            if (onSuccess) {
              onSuccess();
            } else {
              router.navigate({ to: `/candidates/${candidateId}` });
            }
          } else {
            const parsedError = z.string().safeParse(result.error);
            const errorMessage = parsedError.success
              ? parsedError.data
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

  const resetForm = () => {
    form.reset();
    setFile(null);
    setTagsInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {!compact ? (
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
              variant="secondary"
              onClick={resetForm}
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
      ) : null}
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
                  ref={fileInputRef}
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
                    // SAFETY: the <SelectItem> values below are exactly the
                    // DocumentCategory literals.
                    field.handleChange(value as DocumentCategory)
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
        {compact ? (
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={isPending}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
};

export default CandidateDocumentUploadForm;
