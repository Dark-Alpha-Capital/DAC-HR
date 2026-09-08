import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { SubmitButton } from "#/components/shared/submit-button";
import { shouldShowFieldError } from "#/lib/form-feedback";
import { zodFormValidator } from "#/lib/zod-form-validator";
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
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "#/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { useRouter } from "@tanstack/react-router";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import {
  candidateDocumentFormSchema,
  type CandidateDocumentFormSchema,
} from "#/features/candidates/candidate-document-schemas";
import { updateCandidateDocument } from "#/features/candidates/server/mutations/update-candidate-document";
import type { CandidateDocument } from "#/features/candidates/types";

interface CandidateDocumentEditFormProps {
  document: CandidateDocument;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "resume", label: "Resume" },
  { value: "cover-letter", label: "Cover Letter" },
  { value: "portfolio", label: "Portfolio" },
  { value: "other", label: "Other" },
];

const CandidateDocumentEditForm = ({
  document,
}: CandidateDocumentEditFormProps) => {
  const router = useRouter();
  const invalidate = useQueryInvalidation();
  const [tagsInput, setTagsInput] = useState<string>(
    (document.tags || []).join(", "),
  );

  const updateMutation = useMutation({
    mutationFn: async (value: CandidateDocumentFormSchema) => {
      const result = await updateCandidateDocument({
        data: {
          candidateId: document.candidateId,
          documentId: document.id,
          data: value,
        },
      });

      if (result.error !== undefined) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: async (data) => {
      toast.success("Document updated successfully", {
        position: "bottom-right",
        description: "The document has been updated successfully.",
      });
      await invalidate.candidateDetail(document.candidateId);
      await invalidate.documentLists();
      router.navigate({ to: `/candidates/${data?.candidateId}` });
    },
    onError: (error) => {
      console.error(
        "[candidate-document-edit-form] updateCandidateDocument failed",
        error,
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to update document",
        { position: "bottom-right" },
      );
    },
  });

  const form = useForm({
    defaultValues: {
      name: document.name,
      description: document.description || "",
      // SAFETY: the document category column only holds the four
      // CandidateDocumentCategory literals, which the schema also accepts.
      category: document.category as CandidateDocumentFormSchema["category"],
      // Editing preserves the stored file/download URL (no URL input is
      // rendered); it passed this schema's url validation when the document
      // was created, so it stays valid on submit.
      url: document.url,
      tags: document.tags || [],
    },
    validators: {
      onBlur: zodFormValidator(candidateDocumentFormSchema),
      onSubmit: zodFormValidator(candidateDocumentFormSchema),
    },
    onSubmit: ({ value }) => {
      updateMutation.mutate(value);
    },
  });

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tagsArray = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    form.setFieldValue("tags", tagsArray);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Edit Document
          </h2>
          <p className="text-sm text-muted-foreground">
            Update the document details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
              setTagsInput((document.tags || []).join(", "));
            }}
            disabled={updateMutation.isPending}
          >
            Reset
          </Button>
          <SubmitButton
            form="candidate-document-edit-form"
            loading={updateMutation.isPending}
            loadingLabel="Saving..."
          >
            Save Changes
          </SubmitButton>
        </div>
      </div>
      <form
        id="candidate-document-edit-form"
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
              const isInvalid = shouldShowFieldError(
                field.state.meta,
                form.state.submissionAttempts,
              );
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
                  {isInvalid && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="description"
            children={(field) => {
              const isInvalid = shouldShowFieldError(
                field.state.meta,
                form.state.submissionAttempts,
              );
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
                      aria-invalid={isInvalid}
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
                  {isInvalid && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="category"
            children={(field) => {
              const isInvalid = shouldShowFieldError(
                field.state.meta,
                form.state.submissionAttempts,
              );
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      // SAFETY: the <SelectItem> values below are exactly the
                      // schema's category literals.
                      field.handleChange(
                        value as CandidateDocumentFormSchema["category"],
                      )
                    }
                  >
                    <SelectTrigger
                      id={field.name}
                      className="w-full"
                      aria-invalid={isInvalid}
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
            name="tags"
            children={(field) => {
              const isInvalid = shouldShowFieldError(
                field.state.meta,
                form.state.submissionAttempts,
              );
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="tags-input">Tags</FieldLabel>
                  <Input
                    id="tags-input"
                    value={tagsInput}
                    onBlur={field.handleBlur}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    aria-invalid={isInvalid}
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
                  {isInvalid && (
                    <FieldError errors={field.state.meta.errors} />
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

export default CandidateDocumentEditForm;
