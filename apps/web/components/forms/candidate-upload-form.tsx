import * as React from "react";
import { useTransition, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { useUrlSearchParams } from "@/lib/hooks/use-url-search-params";
import * as z from "zod";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldContent,
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
import { Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import {
  candidateFormSchema,
  type CandidateFormSchema,
} from "@/lib/schemas/candidate-form-schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { authClient } from "@/auth-client";
import { Session } from "better-auth";
import { resetCacheForCandidates } from "@/lib/actions/reset-cache";

const CandidateUploadForm = ({
  positions,
  userSession,
}: {
  positions: {
    id: string;
    name: string;
  }[];
  userSession: Session;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { searchParams } = useUrlSearchParams();
  const [selectedSource, setSelectedSource] = React.useState<
    "LinkedIn" | "Upwork" | "Handshake" | "Indeed" | undefined
  >(undefined);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Get the pre-selected position from URL params
  const preSelectedPositionId = searchParams.get("position");

  // Validate that the position exists in the positions array
  const defaultPositionId =
    preSelectedPositionId &&
    positions.some((p) => p.id === preSelectedPositionId)
      ? preSelectedPositionId
      : positions[0]?.id || "";

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      source: undefined as
        | "LinkedIn"
        | "Upwork"
        | "Handshake"
        | "Indeed"
        | undefined,
      sourceUrl: "",
      note: "",
      positionId: defaultPositionId, // Use the pre-selected or default position
    },
    validators: {
      onSubmit: candidateFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!userSession) {
        toast.error("You must be logged in to create a candidate", {
          position: "bottom-right",
        });
        return;
      }

      startTransition(async () => {
        try {
          // First, create the candidate
          const response = await fetch(`/api/candidate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userSession.token}`,
            },
            body: JSON.stringify({
              ...value,
              positionId: value.positionId || "",
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            toast.error(
              typeof result.error === "string"
                ? result.error
                : typeof result.error === "object"
                  ? JSON.stringify(result.error)
                  : "Failed to create candidate",
              {
                position: "bottom-right",
              },
            );
            return;
          }

          const candidateId = result.data?.id;

          if (!candidateId) {
            toast.error("Candidate created but no ID returned", {
              position: "bottom-right",
            });
            return;
          }

          // If resume file was uploaded, upload it as a document
          if (resumeFile) {
            try {
              const formData = new FormData();
              formData.append("file", resumeFile);
              formData.append("name", resumeFile.name || "Resume");
              formData.append("category", "resume");
              formData.append(
                "description",
                "Resume uploaded during candidate creation",
              );

              const documentResponse = await fetch(
                `/api/candidate/${candidateId}/documents`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${userSession.token}`,
                  },
                  body: formData,
                },
              );

              const documentResult = await documentResponse.json();

              if (!documentResponse.ok) {
                console.error("Failed to upload resume:", documentResult);
                toast.warning("Candidate created but resume upload failed", {
                  position: "bottom-right",
                  description:
                    typeof documentResult.error === "string"
                      ? documentResult.error
                      : "The resume could not be uploaded. You can add it later.",
                });
              } else {
                toast.success("Candidate and resume created successfully", {
                  position: "bottom-right",
                  description:
                    "The candidate and resume have been created successfully.",
                  action: {
                    label: "View Candidate",
                    onClick: () => {
                      router.navigate({ to: `/candidates/${candidateId}` });
                    },
                  },
                });
              }
            } catch (documentError) {
              console.error("Error uploading resume:", documentError);
              toast.warning("Candidate created but resume upload failed", {
                position: "bottom-right",
                description:
                  "The resume could not be uploaded. You can add it later.",
              });
            }
          } else {
            toast.success("Candidate created successfully", {
              position: "bottom-right",
              description: "The candidate has been created successfully.",
              action: {
                label: "View Candidate",
                onClick: () => {
                  router.navigate({ to: `/candidates/${candidateId}` });
                },
              },
            });
          }

          await resetCacheForCandidates();

          form.reset();
          setSelectedSource(undefined);
          setResumeFile(null);
          // Clear file input
          const fileInput = document.getElementById(
            "resume-upload",
          ) as HTMLInputElement;
          if (fileInput) {
            fileInput.value = "";
          }
          router.navigate({ to: `/candidates` });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to create candidate",
            {
              position: "bottom-right",
            },
          );
        }
      });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Add New Candidate
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter the candidate details below to add it to the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
              setSelectedSource(undefined);
              setResumeFile(null);
              // Clear file input
              const fileInput = document.getElementById(
                "resume-upload",
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
            form="candidate-upload-form"
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
        id="candidate-upload-form"
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
            name="email"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter the email"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="phone"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === "") return undefined; // Allow empty phone numbers
                // Remove common formatting characters
                const cleaned = value.replace(/[\s\-\(\)\+\.]/g, "");
                // Check if it's all digits and has reasonable length (7-15 digits)
                if (!/^\d{7,15}$/.test(cleaned)) {
                  return [
                    {
                      message:
                        "Please enter a valid phone number (7-15 digits). Format: +1 (555) 123-4567 or 5551234567",
                    },
                  ];
                }
                if (value.length > 20) {
                  return [
                    { message: "Phone number must be at most 20 characters." },
                  ];
                }
                return undefined;
              },
            }}
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter the phone number (e.g., +1 (555) 123-4567)"
                    autoComplete="tel"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="location"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter city, state, or country"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="source"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Source</FieldLabel>
                  <Select
                    value={field.state.value || ""}
                    onValueChange={(value) => {
                      const newSource =
                        value === ""
                          ? undefined
                          : (value as
                              | "LinkedIn"
                              | "Upwork"
                              | "Handshake"
                              | "Indeed");
                      field.handleChange(newSource);
                      setSelectedSource(newSource);
                      // Clear sourceUrl when source is cleared
                      if (value === "") {
                        form.setFieldValue("sourceUrl", "");
                      }
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select a source (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Upwork">Upwork</SelectItem>
                      <SelectItem value="Handshake">Handshake</SelectItem>
                      <SelectItem value="Indeed">Indeed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Select the source where you found this candidate
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          {selectedSource && (
            <form.Field
              name="sourceUrl"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      {selectedSource} URL
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="url"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder={`Enter the ${selectedSource} profile URL`}
                      autoComplete="off"
                    />
                    <FieldDescription>
                      Provide the URL to the candidate's {selectedSource}{" "}
                      profile
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          )}

          <form.Field
            name="positionId"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Position</FieldLabel>
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
                    Select a position to automatically create an application
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <Field>
            <FieldLabel htmlFor="resume-upload">Resume (Optional)</FieldLabel>
            <div className="space-y-2">
              <Input
                id="resume-upload"
                type="file"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    // Validate file size (max 500MB)
                    const maxSize = 500 * 1024 * 1024; // 500MB
                    if (selectedFile.size > maxSize) {
                      toast.error("File size exceeds 500MB limit", {
                        position: "bottom-right",
                      });
                      e.target.value = "";
                      return;
                    }

                    // Block video file types
                    const videoTypes = [
                      "video/mp4",
                      "video/mpeg",
                      "video/quicktime",
                      "video/x-msvideo",
                      "video/x-ms-wmv",
                      "video/webm",
                      "video/ogg",
                      "video/x-matroska",
                      "video/3gpp",
                      "video/x-flv",
                    ];

                    if (videoTypes.includes(selectedFile.type)) {
                      toast.error(
                        "Video files are not allowed. Please upload other file types.",
                        {
                          position: "bottom-right",
                        },
                      );
                      e.target.value = "";
                      return;
                    }

                    setResumeFile(selectedFile);
                  } else {
                    setResumeFile(null);
                  }
                }}
                className="cursor-pointer"
              />
              <FieldDescription>
                Upload the candidate's resume (max 500MB). All file types
                accepted except videos.
              </FieldDescription>
              {resumeFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {resumeFile.name} (
                  {resumeFile.size > 1024 * 1024
                    ? `${(resumeFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(resumeFile.size / 1024).toFixed(2)} KB`}
                  )
                </p>
              )}
            </div>
          </Field>

          <form.Field
            name="note"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Note</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter the note"
                      rows={6}
                      className="min-h-24 resize-none"
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {field.state.value.length}/1000 characters
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>Enter the note</FieldDescription>
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

export default CandidateUploadForm;
