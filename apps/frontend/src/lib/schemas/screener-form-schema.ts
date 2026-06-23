import * as z from "zod";

export const screenerFormSchema = z.object({
  name: z
    .string()
    .min(1, "Screener name is required.")
    .max(200, "Screener name must be at most 200 characters."),
  content: z
    .string()
    .min(1, "Screener content is required.")
    .max(100_000, "Content must be at most 100,000 characters."),
});

export type ScreenerFormSchema = z.infer<typeof screenerFormSchema>;
