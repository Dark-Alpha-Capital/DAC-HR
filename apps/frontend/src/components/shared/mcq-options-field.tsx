import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export type McqOptionInput = {
  id?: string;
  text: string;
};

interface McqOptionsFieldProps {
  options: McqOptionInput[];
  onChange: (options: McqOptionInput[]) => void;
  disabled?: boolean;
  /** Highlight empty options + render errors (wire from the form field's meta). */
  invalid?: boolean;
  /** Field-level errors for the options array (e.g. min/max options). */
  errors?: Array<{ message?: string } | undefined>;
}

export function McqOptionsField({
  options,
  onChange,
  disabled = false,
  invalid = false,
  errors,
}: McqOptionsFieldProps) {
  const updateOption = (index: number, text: string) => {
    const next = options.map((option, i) =>
      i === index ? { ...option, text } : option,
    );
    onChange(next);
  };

  const addOption = () => {
    if (options.length >= 10) {
      return;
    }
    onChange([...options, { text: "" }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      return;
    }
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3" data-invalid={invalid}>
      <FieldLabel>Answer options</FieldLabel>
      {options.map((option, index) => (
        <Field key={option.id ?? `option-${index}`}>
          <div className="flex items-center gap-2">
            <span className="w-6 text-sm text-muted-foreground tabular-nums">
              {index + 1}.
            </span>
            <Input
              value={option.text}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              maxLength={200}
              disabled={disabled}
              className="flex-1"
              aria-invalid={invalid && option.text.trim().length === 0}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => removeOption(index)}
              disabled={disabled || options.length <= 2}
              aria-label={`Remove option ${index + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Field>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={addOption}
        disabled={disabled || options.length >= 10}
      >
        <Plus className="mr-1.5 size-4" />
        Add option
      </Button>
      {invalid ? (
        <FieldError
          errors={errors}
          className="mt-1"
        >
          {errors?.length
            ? undefined
            : "Add at least two options and fill in every option."}
        </FieldError>
      ) : null}
    </div>
  );
}
