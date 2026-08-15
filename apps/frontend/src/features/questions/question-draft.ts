import type {
  QuestionEditFormSchema,
  QuestionFormSchema,
} from "#/features/questions/schemas";

export type McqOptionInput = { id?: string; text: string };

/** Two blank options for a fresh MCQ. */
export const defaultMcqOptions = (): McqOptionInput[] => [
  { text: "" },
  { text: "" },
];

/** Seed MCQ options from an existing question (or defaults for a new one). */
export function initialOptionsFrom(
  questionType: string,
  options?: Array<{ id?: string; text: string }> | null,
): McqOptionInput[] {
  if (questionType !== "mcq") {
    return defaultMcqOptions();
  }
  const existing = options ?? [];
  if (existing.length < 2) {
    return defaultMcqOptions();
  }
  return existing.map((option) => ({ id: option.id, text: option.text }));
}

/** Build a create-question payload for the shared zod schema. */
export function buildQuestionFormPayload(draft: {
  questionType: "text" | "mcq";
  questionText: string;
  options?: McqOptionInput[];
  positionId: string;
  roundTemplateId: string;
}): QuestionFormSchema {
  return draft.questionType === "mcq"
    ? {
        questionType: "mcq",
        questionText: draft.questionText,
        options: draft.options ?? [],
        positionId: draft.positionId,
        roundTemplateId: draft.roundTemplateId,
      }
    : {
        questionType: "text",
        questionText: draft.questionText,
        positionId: draft.positionId,
        roundTemplateId: draft.roundTemplateId,
      };
}

/** Build an edit-question payload for the shared zod schema. */
export function buildQuestionEditPayload(draft: {
  questionType: "text" | "mcq";
  questionText: string;
  options?: McqOptionInput[];
}): QuestionEditFormSchema {
  return draft.questionType === "mcq"
    ? {
        questionType: "mcq",
        questionText: draft.questionText,
        options: draft.options ?? [],
      }
    : {
        questionType: "text",
        questionText: draft.questionText,
      };
}
