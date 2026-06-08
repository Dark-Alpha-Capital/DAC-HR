import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { updateApplication } from "@/lib/actions/update-application";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

type Personality =
  | "ENFJ"
  | "ENFP"
  | "ENTJ"
  | "ENTP"
  | "ESFJ"
  | "ESFP"
  | "ESTJ"
  | "ESTP"
  | "INFJ"
  | "INTJ"
  | "INTP"
  | "ISFJ"
  | "ISFP"
  | "ISTJ"
  | "ISTP"
  | null;

interface ApplicationPersonalitySelectorProps {
  applicationId: string;
  currentPersonality: Personality;
}

const personalityOptions: Exclude<Personality, null>[] = [
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<string>(currentPersonality || NONE_VALUE);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    const personalityValue =
      newValue === NONE_VALUE ? null : (newValue as Personality);

    startTransition(async () => {
      const result = await updateApplication({
        applicationId,
        personality: personalityValue,
      });

      if (result.error) {
        toast.error(result.error);
        // Revert to previous value on error
        setValue(currentPersonality || NONE_VALUE);
      } else {
        toast.success("Personality updated successfully");
        router.invalidate();
      }
    });
  };

  return (
    <div className="w-full">
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-full">
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
