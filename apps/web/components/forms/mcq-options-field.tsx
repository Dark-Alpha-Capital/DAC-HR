import { Button } from "@workspace/ui/components/button";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Plus, Trash2 } from "lucide-react";

export type McqOptionInput = {
  id?: string;
  text: string;
};

interface McqOptionsFieldProps {
  options: McqOptionInput[];
  onChange: (options: McqOptionInput[]) => void;
  disabled?: boolean;
}

export function McqOptionsField({
  options,
  onChange,
  disabled = false,
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
    <div className="space-y-3">
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
    </div>
  );
}
