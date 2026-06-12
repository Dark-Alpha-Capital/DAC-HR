import type { QuestionOption } from "@workspace/db/question-types";

export function normalizeMcqOptions(
  options: Array<{ id?: string; text: string }>,
): QuestionOption[] {
  return options.map((option) => ({
    id: option.id ?? crypto.randomUUID(),
    text: option.text.trim(),
  }));
}

export function getOptionLabel(
  options: QuestionOption[] | null | undefined,
  selectedOptionId: string | null | undefined,
): string | null {
  if (!options || !selectedOptionId) {
    return null;
  }

  return options.find((option) => option.id === selectedOptionId)?.text ?? null;
}
