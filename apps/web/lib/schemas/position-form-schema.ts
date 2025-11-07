import * as z from "zod";

export const positionFormSchema = z.object({
  name: z
    .string()
    .min(5, "Position name must be at least 5 characters.")
    .max(32, "Position name must be at most 32 characters."),

  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(1000, "Description must be at most 1000 characters."),
});

export type PositionFormSchema = z.infer<typeof positionFormSchema>;
