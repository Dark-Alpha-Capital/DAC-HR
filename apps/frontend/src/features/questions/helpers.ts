import type { QuestionType } from "@workspace/db/enums";

export function getQuestionTypeLabel(questionType: QuestionType | string): string {
  switch (questionType) {
    case "text":
      return "Text";
    case "mcq":
      return "MCQ";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    default:
      return questionType;
  }
}
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
