import * as z from "zod";

const questionTextField = z
  .string()
  .min(1, "Question text is required.")
  .max(500, "Question text must be at most 500 characters.");

const positionIdField = z.string().min(1, "Position is required.");
const roundTemplateIdField = z.string().min(1, "Round is required.");

const mcqOptionSchema = z.object({
  id: z.string().uuid().optional(),
  text: z
    .string()
    .min(1, "Option text is required.")
    .max(200, "Option text must be at most 200 characters."),
});

const mcqOptionsField = z
  .array(mcqOptionSchema)
  .min(2, "At least 2 options are required.")
  .max(10, "At most 10 options are allowed.");

const questionFormBase = {
  questionText: questionTextField,
  positionId: positionIdField,
  roundTemplateId: roundTemplateIdField,
};

export const questionFormSchema = z.discriminatedUnion("questionType", [
  z.object({
    ...questionFormBase,
    questionType: z.literal("text"),
  }),
  z.object({
    ...questionFormBase,
    questionType: z.literal("mcq"),
    options: mcqOptionsField,
  }),
]);

export const questionEditFormSchema = z.discriminatedUnion("questionType", [
  z.object({
    questionText: questionTextField,
    questionType: z.literal("text"),
  }),
  z.object({
    questionText: questionTextField,
    questionType: z.literal("mcq"),
    options: mcqOptionsField,
  }),
]);

export const interviewAnswerSchema = z.discriminatedUnion("answerType", [
  z.object({
    questionId: z.string().min(1),
    answerType: z.literal("text"),
    answerText: z.string().min(1, "Answer cannot be empty"),
  }),
  z.object({
    questionId: z.string().min(1),
    answerType: z.literal("mcq"),
    selectedOptionId: z.string().min(1, "Please select an option"),
  }),
]);

export type QuestionFormSchema = z.infer<typeof questionFormSchema>;
export type QuestionEditFormSchema = z.infer<typeof questionEditFormSchema>;
export type InterviewAnswerSchema = z.infer<typeof interviewAnswerSchema>;
