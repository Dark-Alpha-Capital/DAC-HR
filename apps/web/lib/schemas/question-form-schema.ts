import * as z from "zod";

export const questionFormSchema = z.object({
  questionText: z
    .string()
    .min(1, "Question text is required.")
    .max(500, "Question text must be at most 500 characters."),
  positionId: z.string().min(1, "Position is required."),
  roundTemplateId: z.string().min(1, "Round is required."),
});

export const questionEditFormSchema = z.object({
  questionText: z
    .string()
    .min(1, "Question text is required.")
    .max(500, "Question text must be at most 500 characters."),
});

export type QuestionFormSchema = z.infer<typeof questionFormSchema>;
export type QuestionEditFormSchema = z.infer<typeof questionEditFormSchema>;
