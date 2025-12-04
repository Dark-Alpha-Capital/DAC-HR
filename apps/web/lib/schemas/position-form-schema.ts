import * as z from "zod";

export const positionFormSchema = z.object({
  name: z
    .string()
    .min(1, "Position name is required."),

  description: z
    .string()
    .min(1, "Description is required."),
});

export type PositionFormSchema = z.infer<typeof positionFormSchema>;
