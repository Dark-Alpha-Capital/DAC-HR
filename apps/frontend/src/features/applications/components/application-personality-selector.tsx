import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { updateApplication } from "#/features/applications/server/mutations/applications";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import { toast } from "sonner";
import type { Personality } from "#/lib/enums";

interface ApplicationPersonalitySelectorProps {
  applicationId: string;
  currentPersonality: Personality | null;
}

const personalityOptions: Personality[] = [
  "ENFJ",
  "ENFP",
  "ENTJ",
  "ENTP",
  "ESFJ",
  "ESFP",
  "ESTJ",
  "ESTP",
  "INFJ",
  "INTJ",
  "INTP",
  "ISFJ",
  "ISFP",
  "ISTJ",
  "ISTP",
];

const NONE_VALUE = "__none__";

export default function ApplicationPersonalitySelector({
  applicationId,
  currentPersonality,
}: ApplicationPersonalitySelectorProps) {
  const invalidate = useQueryInvalidation();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<string>(currentPersonality || NONE_VALUE);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    // SAFETY: the Select only offers values from `personalityOptions` plus
    // NONE_VALUE, so any other selection is one of the Personality literals.
    const personalityValue =
      newValue === NONE_VALUE ? null : (newValue as Personality);

    startTransition(async () => {
      const result = await updateApplication({
        data: {
          applicationId,
          personality: personalityValue,
        },
      });

      if (result.error) {
        toast.error(result.error);
        // Revert to previous value on error
        setValue(currentPersonality || NONE_VALUE);
      } else {
        toast.success("Personality updated successfully");
        void invalidate.applicationDetail(applicationId);
      }
    });
  };

  return (
    <div className="w-fit">
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select personality type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>None</SelectItem>
          {personalityOptions.map((personality) => (
            <SelectItem key={personality} value={personality}>
              {personality}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
