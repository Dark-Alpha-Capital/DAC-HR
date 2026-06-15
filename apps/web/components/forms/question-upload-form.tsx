import * as React from "react";
import { useTransition } from "react";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  questionFormSchema,
  type QuestionFormSchema,
} from "@/lib/schemas/question-form-schema";
import { createQuestion } from "@/lib/actions/create-question";
import { McqOptionsField } from "@/components/forms/mcq-options-field";

interface QuestionUploadFormProps {
  positions: {
    id: string;
    name: string;
  }[];
  rounds: Array<{ id: string; name: string; description: string | null }>;
  preSelectedPositionId?: string;
  preSelectedRoundId?: string;
  isLoadingRounds?: boolean;
  onPositionChange: (positionId: string) => void;
  onResetSearch?: () => void;
}

const defaultMcqOptions = () => [{ text: "" }, { text: "" }];

const QuestionUploadForm = ({
  positions,
  rounds,
  preSelectedPositionId = "",
  preSelectedRoundId = "",
  isLoadingRounds = false,
  onPositionChange,
  onResetSearch,
}: QuestionUploadFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      questionText: "",
      positionId: preSelectedPositionId,
      roundTemplateId: preSelectedRoundId,
      questionType: "text" as "text" | "mcq",
      options: defaultMcqOptions(),
    },
    onSubmit: async ({ value }) => {
      const payload: QuestionFormSchema =
        value.questionType === "mcq"
          ? {
              questionText: value.questionText,
              positionId: value.positionId,
              roundTemplateId: value.roundTemplateId,
              questionType: "mcq",
              options: value.options,
            }
          : {
              questionText: value.questionText,
              positionId: value.positionId,
              roundTemplateId: value.roundTemplateId,
              questionType: "text",
            };

      const parsed = questionFormSchema.safeParse(payload);
      if (!parsed.success) {
        toast.error("Please fix the form errors", { position: "bottom-right" });
        return;
      }

      startTransition(async () => {
        const result = await createQuestion({ data: parsed.data });

        if (result.error) {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Failed to create question",
            {
              position: "bottom-right",
            },
          );
        } else {
          toast.success("Question created successfully", {
            position: "bottom-right",
            description: "The question has been added to the selected round.",
            action: {
              label: "View Questions",
              onClick: () => {
                router.navigate({ to: "/questions", search: {} as any });
              },
            },
          });
          form.reset();
          onResetSearch?.();
        }
      });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Add New Question
          </h2>
          <p className="text-sm text-muted-foreground">
            Select a position and round, then enter the question details below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
              onResetSearch?.();
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="question-upload-form"
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
        id="question-upload-form"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup>
          <form.Field
            name="positionId"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Position</FieldLabel>
                  <Select
                    value={field.state.value || undefined}
                    onValueChange={(value) => {
                      field.handleChange(value);
                      form.setFieldValue("roundTemplateId", "");
                      onPositionChange(value);
                    }}
                    aria-invalid={isInvalid}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select a position" />
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
                    First, select the position to see available rounds.
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => state.values.positionId}
            children={(positionId) => (
              <form.Field
                name="roundTemplateId"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  const isDisabled = !positionId;
                  const selectedPosition = positions.find(
                    (p) => p.id === positionId,
                  );

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Round</FieldLabel>
                      <Select
                        value={field.state.value || undefined}
                        onValueChange={(value) => {
                          field.handleChange(value);
                        }}
                        disabled={isDisabled}
                        aria-invalid={isInvalid}
                      >
                        <SelectTrigger
                          id={field.name}
                          aria-invalid={isInvalid}
                          className="w-full"
                          disabled={isDisabled}
                        >
                          <SelectValue
                            placeholder={
                              isLoadingRounds
                                ? "Loading rounds..."
                                : !positionId
                                  ? "Select a position first"
                                  : rounds.length === 0
                                    ? "No rounds available - Create one first"
                                    : "Select a round"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingRounds ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : rounds.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                              {positionId
                                ? "No rounds available"
                                : "Select a position first"}
                            </div>
                          ) : (
                            rounds.map((round) => (
                              <SelectItem key={round.id} value={round.id}>
                                {round.name}
                                {round.description && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    - {round.description}
                                  </span>
                                )}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {rounds.length === 0 && positionId && !isLoadingRounds ? (
                        <div className="mt-3 p-4 border border-dashed rounded-lg bg-muted/50">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                No rounds found for{" "}
                                <span className="font-semibold">
                                  {selectedPosition?.name || "this position"}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                You need to create a round first before adding
                                questions to this position.
                              </p>
                            </div>
                            <Button
                              asChild
                              size="sm"
                              variant="default"
                              className="w-full"
                            >
                              <Link
                                to={`/rounds/new?position=${positionId}` as any}
                              >
                                Create Round for{" "}
                                {selectedPosition?.name || "Position"}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <FieldDescription>
                          Then, select the round where this question will be
                          added.
                        </FieldDescription>
                      )}
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
            )}
          />

          <form.Field
            name="questionType"
            children={(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Question type</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value: "text" | "mcq") => {
                    field.handleChange(value);
                    if (value === "mcq") {
                      const currentOptions = form.getFieldValue("options");
                      if (currentOptions.length < 2) {
                        form.setFieldValue("options", defaultMcqOptions());
                      }
                    }
                  }}
                >
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="mcq">Multiple choice</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Text questions accept free-form answers. Multiple choice
                  questions show selectable options to candidates.
                </FieldDescription>
              </Field>
            )}
          />

          <form.Field
            name="questionText"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Question Text</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter the question text"
                      rows={6}
                      className="min-h-24 resize-none"
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {field.state.value.length}/500 characters
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => state.values.questionType}
            children={(questionType) =>
              questionType === "mcq" ? (
                <form.Field
                  name="options"
                  children={(field) => (
                    <McqOptionsField
                      options={field.state.value}
                      onChange={field.handleChange}
                      disabled={isPending}
                    />
                  )}
                />
              ) : null
            }
          />
        </FieldGroup>
      </form>
    </div>
  );
};

export default QuestionUploadForm;
