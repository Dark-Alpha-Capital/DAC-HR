import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
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
import { Loader2 } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  questionFormSchema,
  type QuestionFormSchema,
} from "#/features/questions/schemas";
import { createQuestion } from "#/features/questions/server/mutations/create-question";
import { getRoundsByPosition } from "#/features/rounds/server/queries/get-rounds-by-position";
import { McqOptionsField } from "#/components/shared/mcq-options-field";
import { queryKeys } from "#/lib/query/query-keys";

interface QuestionUploadFormProps {
  positions: {
    id: string;
    name: string;
  }[];
  preSelectedPositionId?: string;
  preSelectedRoundId?: string;
}

const defaultMcqOptions = () => [{ text: "" }, { text: "" }];

const emptyFormValues = {
  questionText: "",
  positionId: "",
  roundTemplateId: "",
  questionType: "text" as "text" | "mcq",
  options: defaultMcqOptions(),
};

function RoundSelectField({
  positionId,
  value,
  onChange,
  positions,
}: {
  positionId: string;
  value: string;
  onChange: (roundId: string) => void;
  positions: QuestionUploadFormProps["positions"];
}) {
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: queryKeys.rounds.byPosition(positionId),
    queryFn: () => getRoundsByPosition({ data: positionId }),
    enabled: Boolean(positionId),
  });

  const selectedPosition = positions.find((position) => position.id === positionId);
  const isDisabled = !positionId;

  return (
    <Field>
      <FieldLabel htmlFor="roundTemplateId">Round</FieldLabel>
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={isDisabled || isLoading}
      >
        <SelectTrigger
          id="roundTemplateId"
          className="w-full"
          disabled={isDisabled || isLoading}
        >
          <SelectValue
            placeholder={
              isLoading
                ? "Loading rounds..."
                : !positionId
                  ? "Select a position first"
                  : rounds.length === 0
                    ? "No rounds for this position"
                    : "Select a round"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            rounds.map((round) => (
              <SelectItem key={round.id} value={round.id}>
                {round.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {positionId && !isLoading && rounds.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed bg-muted/50 p-4">
          <p className="text-sm font-medium">
            No rounds for {selectedPosition?.name ?? "this position"} yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a round for this position before adding questions.
          </p>
          <Button asChild size="sm" className="mt-3 w-full">
            <Link to="/rounds/new" search={{ position: positionId }}>
              Create round
            </Link>
          </Button>
        </div>
      ) : (
        <FieldDescription>
          Choose the interview round this question belongs to.
        </FieldDescription>
      )}
    </Field>
  );
}

const QuestionUploadForm = ({
  positions,
  preSelectedPositionId = "",
  preSelectedRoundId = "",
}: QuestionUploadFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: {
      ...emptyFormValues,
      positionId: preSelectedPositionId,
      roundTemplateId: preSelectedRoundId,
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
        toast.error("Please complete all required fields", {
          position: "bottom-right",
        });
        return;
      }

      startTransition(async () => {
        const result = await createQuestion({ data: parsed.data });

        if (result.error) {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Failed to create question",
            { position: "bottom-right" },
          );
          return;
        }

        toast.success("Question created", {
          position: "bottom-right",
          description: "Added to the selected round.",
        });
        form.reset();
        router.navigate({
          to: "/questions",
          search: { search: "", position: [], round: [], page: undefined },
        });
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
            Select a position, then a round, then enter the question.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => form.reset()}
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
                Saving...
              </>
            ) : (
              "Save question"
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
                    }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
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
                    Pick the job position first.
                  </FieldDescription>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
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

                  return (
                    <div data-invalid={isInvalid}>
                      <RoundSelectField
                        positionId={positionId}
                        value={field.state.value}
                        onChange={field.handleChange}
                        positions={positions}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </div>
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
                  <FieldLabel htmlFor={field.name}>Question</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter the question"
                      rows={5}
                      className="min-h-24 resize-none"
                      aria-invalid={isInvalid}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {field.state.value.length}/500
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
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
