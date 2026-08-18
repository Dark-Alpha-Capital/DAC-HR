import type { QuestionCategory, QuestionType } from "./enums";
import type { QuestionOption } from "./question-types";

export const INITIAL_PERSONALITY_SCREENING_ROUND = {
  name: "Initial Personality Screening",
  description: "Initial personality screening round",
} as const;

type PersonalityScreeningQuestionTemplate = {
  questionText: string;
  questionType: QuestionType;
  category: QuestionCategory;
  options: QuestionOption[];
  timeLimitSeconds: number;
  orderIndex: number;
};

const J_OR_P_OPTIONS = [
  { id: "j", text: "J" },
  { id: "p", text: "P" },
] as const satisfies QuestionOption[];

const T_OR_F_OPTIONS = [
  { id: "t", text: "T" },
  { id: "f", text: "F" },
] as const satisfies QuestionOption[];

const S_OR_N_OPTIONS = [
  { id: "s", text: "S" },
  { id: "n", text: "N" },
] as const satisfies QuestionOption[];

const E_OR_I_OPTIONS = [
  { id: "e", text: "E" },
  { id: "i", text: "I" },
] as const satisfies QuestionOption[];

export const INITIAL_PERSONALITY_SCREENING_QUESTION_TEMPLATES = [
  {
    questionText:
      "Do you prefer to have a clear and structured plan (J) or to go with the flow and stay open to options (P)?",
    questionType: "mcq",
    category: "screening",
    options: [...J_OR_P_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 1,
  },
  {
    questionText:
      "Do you feel more comfortable when tasks are decided and organized (J) or do you like to keep your options open and be spontaneous (P)?",
    questionType: "mcq",
    category: "screening",
    options: [...J_OR_P_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 2,
  },
  {
    questionText:
      "Do you tend to schedule and plan your activities (J) or be more spontaneous and flexible (P)?",
    questionType: "mcq",
    category: "screening",
    options: [...J_OR_P_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 3,
  },
  {
    questionText:
      "When making a decision, is it more important to you to be logical and consistent (T) or to consider people's feelings and values (F)?",
    questionType: "mcq",
    category: "screening",
    options: [...T_OR_F_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 4,
  },
  {
    questionText:
      "Do you primarily rely on logic and facts (T) or emotions and values (F) when making decisions?",
    questionType: "mcq",
    category: "screening",
    options: [...T_OR_F_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 5,
  },
  {
    questionText:
      "In discussions, do you prefer to debate the facts (T) or explore people's perspectives and feelings (F)?",
    questionType: "mcq",
    category: "screening",
    options: [...T_OR_F_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 6,
  },
  {
    questionText:
      "Do you prefer dealing with facts and details (S) or possibilities and big ideas (N)?",
    questionType: "mcq",
    category: "screening",
    options: [...S_OR_N_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 7,
  },
  {
    questionText:
      "Do you focus more on the present and current realities (S) or the future and potential possibilities (N)?",
    questionType: "mcq",
    category: "screening",
    options: [...S_OR_N_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 8,
  },
  {
    questionText:
      "Do you trust experience and evidence more (S) or hunches and possibilities (N)?",
    questionType: "mcq",
    category: "screening",
    options: [...S_OR_N_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 9,
  },
  {
    questionText:
      "In a group setting do you feel more energized (E) or more drained (I)?",
    questionType: "mcq",
    category: "screening",
    options: [...E_OR_I_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 10,
  },
  {
    questionText:
      "Do you prefer spending your free time with a lot of friends (E) or alone/in a small group (I)?",
    questionType: "mcq",
    category: "screening",
    options: [...E_OR_I_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 11,
  },
  {
    questionText:
      "Would you rather give a presentation (E) or work behind the scenes (I)?",
    questionType: "mcq",
    category: "screening",
    options: [...E_OR_I_OPTIONS],
    timeLimitSeconds: 60,
    orderIndex: 12,
  },
] as const satisfies PersonalityScreeningQuestionTemplate[];

export function createInitialPersonalityScreeningQuestions() {
  return INITIAL_PERSONALITY_SCREENING_QUESTION_TEMPLATES.map((question) => ({
    id: crypto.randomUUID(),
    questionText: question.questionText,
    questionType: question.questionType,
    category: question.category,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
    })),
    timeLimitSeconds: question.timeLimitSeconds,
    orderIndex: question.orderIndex,
  }));
}
