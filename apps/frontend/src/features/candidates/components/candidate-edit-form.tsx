import * as React from "react";
import { useMutation } from "@tanstack/react-query";
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
import { PhoneInput } from "#/components/ui/phone-input";
import { US_STATES } from "#/lib/location";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "#/components/ui/input-group";
import { Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import {
  candidateFormSchema,
  type CandidateFormSchema,
} from "#/features/candidates/schemas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { updateCandidate } from "#/features/candidates/server/mutations/update-candidate";
import type { Candidate } from "@workspace/db/schema";

interface CandidateEditFormProps {
  candidate: Candidate & { positionIds?: string[] };
}

const SOURCES = ["LinkedIn", "Upwork", "Handshake", "Indeed"] as const;
type Source = (typeof SOURCES)[number];

const isSource = (value: unknown): value is Source =>
  typeof value === "string" && (SOURCES as readonly string[]).includes(value);

const CandidateEditForm = ({ candidate }: CandidateEditFormProps) => {
  const router = useRouter();
  const invalidate = useQueryInvalidation();
  const [selectedSource, setSelectedSource] = React.useState<
    Source | undefined
  >(isSource(candidate.source) ? candidate.source : undefined);

  const updateMutation = useMutation({
    mutationFn: async (value: CandidateFormSchema) => {
      const result = await updateCandidate({
        data: [candidate.id, value],
      });

      if (result.error !== undefined) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Failed to update candidate",
        );
      }
      return result.data;
    },
    onSuccess: async (data) => {
      toast.success("Candidate updated successfully", {
        position: "bottom-right",
        description: "The candidate has been updated successfully.",
        action: {
          label: "View Candidate",
          onClick: () => {
            router.navigate({ to: `/candidates/${data?.id}` });
          },
        },
      });
      if (data?.id) {
        await invalidate.candidateDetail(data.id);
      }
      router.navigate({ to: `/candidates/${data?.id}` });
    },
    onError: (error) => {
      console.error("[candidate-edit-form] updateCandidate failed", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update candidate",
        { position: "bottom-right" },
      );
    },
  });

  const form = useForm({
    defaultValues: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone || "",
      location: candidate.location || "",
      locationCity: candidate.locationCity || "",
      locationState: candidate.locationState || "",
      source: isSource(candidate.source) ? candidate.source : undefined,
      sourceUrl: candidate.sourceUrl || "",
      note: candidate.note || "",
      positionIds: candidate.positionIds || [],
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = candidateFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.format();
        }
        return undefined;
      },
    },
    onSubmitInvalid: ({ value }) => {
      const result = candidateFormSchema.safeParse(value);
      if (result.success) return;
      const flattened = result.error.flatten();
      const messages = [
        ...Object.values(flattened.fieldErrors).flat(),
        ...flattened.formErrors,
      ];
      console.error(
        "[candidate-edit-form] validation failed",
        JSON.stringify(flattened),
      );
      toast.error(
        messages.length > 0
          ? messages.join(" ")
          : "Please fix the highlighted fields.",
        { position: "bottom-right" },
      );
    },
    onSubmit: ({ value }) => {
      console.log(
        "[candidate-edit-form] form submitted",
        JSON.stringify(value),
      );
      updateMutation.mutate(value);
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Edit Candidate
          </h2>
          <p className="text-sm text-muted-foreground">
            Update the candidate details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
              setSelectedSource(
                isSource(candidate.source) ? candidate.source : undefined,
              );
            }}
            disabled={updateMutation.isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="candidate-edit-form"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
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
        id="candidate-edit-form"
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
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                  <PhoneInput
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(value) => field.handleChange(value)}
                    aria-invalid={isInvalid}
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
                        value === "" ? undefined : (value as Source);
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
            name="locationCity"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>City</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter city (e.g., Philadelphia)"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Field
            name="locationState"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>State</FieldLabel>
                  <Select
                    value={field.state.value || ""}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select state (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.abbr} value={state.abbr}>
                          {state.abbr} — {state.name}
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

export default CandidateEditForm;
