import * as z from "zod";

export const candidateDocumentFormSchema = z.object({
  name: z
    .string()
    .min(1, "Document name is required.")
    .max(255, "Document name must be at most 255 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters."),
  category: z.enum(["resume", "cover-letter", "portfolio", "other"]),
  tags: z.array(z.string()),
});

export type CandidateDocumentFormSchema = z.infer<
  typeof candidateDocumentFormSchema
>;

