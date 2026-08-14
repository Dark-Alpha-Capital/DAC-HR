import * as z from "zod";

export const roundFormSchema = z.object({
  name: z
    .string()
    .min(1, "Round name is required.")
    .max(100, "Round name must be at most 100 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters."),
  positionId: z.string().min(1, "Position is required."),
});

export const roundEditFormSchema = z.object({
  name: z
    .string()
    .min(1, "Round name is required.")
    .max(100, "Round name must be at most 100 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters."),
});

export type RoundFormSchema = z.infer<typeof roundFormSchema>;
export type RoundEditFormSchema = z.infer<typeof roundEditFormSchema>;
