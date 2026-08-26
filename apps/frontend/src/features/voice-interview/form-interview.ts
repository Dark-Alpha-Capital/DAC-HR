/**
 * Pure form-round helpers for the candidate interview page.
 *
 * Form rounds always start at question 1 (index 0) and cannot complete while
 * any question is still blank.
 */

export type FormAnswerValue =
  | { type: "text"; text: string }
  | { type: "mcq"; selectedOptionId: string };

export const FIRST_FORM_QUESTION_INDEX = 0;

export function hasFormAnswer(answer: FormAnswerValue | undefined): boolean {
  if (!answer) {
    return false;
  }
  if (answer.type === "text") {
    return answer.text.trim().length > 0;
  }
  return answer.selectedOptionId.length > 0;
}

export function unansweredFormQuestionIndexes(
  questions: Array<{ id: string }>,
  answers: Record<string, FormAnswerValue | undefined>,
): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    if (!question || !hasFormAnswer(answers[question.id])) {
      indexes.push(i);
    }
  }
  return indexes;
}

export function hasStoredFormResponse(response: {
  answerText?: string | null;
  selectedOptionId?: string | null;
  transcript?: string | null;
}): boolean {
  return (
    Boolean(response.selectedOptionId?.trim()) ||
    Boolean(response.answerText?.trim()) ||
    Boolean(response.transcript?.trim())
  );
}

export function unansweredStoredFormQuestionIndexes(
  questions: Array<{ id: string }>,
  responses: Array<{
    questionId: string;
    answerText?: string | null;
    selectedOptionId?: string | null;
    transcript?: string | null;
  }>,
): number[] {
  const byQuestionId = new Map(
    responses.map((response) => [response.questionId, response]),
  );
  const indexes: number[] = [];
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    if (!question) {
      indexes.push(i);
      continue;
    }
    const stored = byQuestionId.get(question.id);
    if (!stored || !hasStoredFormResponse(stored)) {
      indexes.push(i);
    }
  }
  return indexes;
}

export function sortQuestionsByOrder<T extends { orderIndex?: number | null }>(
  questions: T[],
): T[] {
  return questions.toSorted(
    (a, b) =>
      (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
      (b.orderIndex ?? Number.MAX_SAFE_INTEGER),
  );
}

export function formatUnansweredQuestionLabel(indexes: number[]): string {
  const numbers = indexes.map((index) => index + 1);
  if (numbers.length === 0) {
    return "";
  }
  if (numbers.length === 1) {
    return `question ${numbers[0]}`;
  }
  if (numbers.length === 2) {
    return `questions ${numbers[0]} and ${numbers[1]}`;
  }
  const last = numbers.at(-1);
  return `questions ${numbers.slice(0, -1).join(", ")}, and ${last}`;
}
