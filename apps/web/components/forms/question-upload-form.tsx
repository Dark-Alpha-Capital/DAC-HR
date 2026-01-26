"use client";

import * as React from "react";
import { useTransition, useState, useEffect } from "react";
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
import Link from "next/link";
import { questionFormSchema } from "@/lib/schemas/question-form-schema";
import { createQuestion } from "@/lib/actions/create-question";
import { getRoundsByPosition } from "@/lib/actions/get-rounds-by-position";

interface QuestionUploadFormProps {
  positions: {
    id: string;
    name: string;
  }[];
  preSelectedPositionId?: string;
  preSelectedRoundId?: string;
}

const QuestionUploadForm = ({
  positions,
  preSelectedPositionId = "",
  preSelectedRoundId = "",
}: QuestionUploadFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rounds, setRounds] = useState<
    Array<{ id: string; name: string; description: string | null }>
  >([]);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  const [positionId, setPositionId] = useState<string>(preSelectedPositionId);

  const form = useForm({
    defaultValues: {
      questionText: "",
      positionId: preSelectedPositionId,
      roundTemplateId: preSelectedRoundId,
    },
    validators: {
      onSubmit: questionFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await createQuestion(value);

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
                router.push("/questions");
              },
            },
          });
          form.reset();
        }
      });
    },
  });

  // Fetch rounds when position changes
  useEffect(() => {
    const fetchRounds = async () => {
      if (!positionId) {
        setRounds([]);
        form.setFieldValue("roundTemplateId", "");
        return;
      }

      setIsLoadingRounds(true);
      try {
        const fetchedRounds = await getRoundsByPosition(positionId);
        setRounds(fetchedRounds);
        // Reset round selection if current round is not in the new list
        const currentRoundId = form.getFieldValue("roundTemplateId");
        if (
          currentRoundId &&
          !fetchedRounds.find((r) => r.id === currentRoundId)
        ) {
          form.setFieldValue("roundTemplateId", "");
        }
      } catch (error) {
        console.error("Error fetching rounds:", error);
        toast.error("Failed to load rounds for this position", {
          position: "bottom-right",
        });
        setRounds([]);
      } finally {
        setIsLoadingRounds(false);
      }
    };

    fetchRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

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
              setRounds([]);
              setPositionId("");
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
                    value={field.state.value || ""}
                    onValueChange={(value) => {
                      field.handleChange(value);
                      setPositionId(value);
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
                      <SelectSeparator />
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

          <form.Field
            name="roundTemplateId"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const isDisabled = !positionId || isLoadingRounds;
              const selectedPosition = positions.find(
                (p) => p.id === positionId,
              );

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Round</FieldLabel>
                  <Select
                    value={field.state.value || ""}
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
                        <>
                          <SelectSeparator />
                          {rounds.map((round) => (
                            <SelectItem key={round.id} value={round.id}>
                              {round.name}
                              {round.description && (
                                <span className="text-muted-foreground ml-2 text-xs">
                                  - {round.description}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </>
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
                          <Link href={`/rounds/new?position=${positionId}`}>
                            Create Round for{" "}
                            {selectedPosition?.name || "Position"}
                          </Link>
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          After creating the round, come back here to add your
                          question.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <FieldDescription>
                      Then, select the round where this question will be added.
                    </FieldDescription>
                  )}
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
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
        </FieldGroup>
      </form>
    </div>
  );
};

export default QuestionUploadForm;
