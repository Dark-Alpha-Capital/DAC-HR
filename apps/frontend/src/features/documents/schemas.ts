import * as z from "zod";

export const documentUploadInputSchema = z.object({
  name: z
    .string()
    .min(1, "Document name is required.")
    .max(255, "Document name must be at most 255 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters."),
  categoryIds: z
    .array(z.string())
    .min(1, "At least one category is required."),
  tags: z.array(z.string()),
});

export type DocumentUploadInput = z.infer<typeof documentUploadInputSchema>;

export const documentFormSchema = documentUploadInputSchema.extend({
  url: z.string().url("Invalid URL format."),
});

export type DocumentFormSchema = z.infer<typeof documentFormSchema>;
