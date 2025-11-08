import * as z from "zod";

export const questionFormSchema = z.object({
  questionText: z
    .string()
    .min(1, "Question text is required.")
    .max(500, "Question text must be at most 500 characters."),
  questionType: z.enum(["behavioral", "technical", "skill"], {
    required_error: "Question type is required.",
  }),
});

export type QuestionFormSchema = z.infer<typeof questionFormSchema>;
