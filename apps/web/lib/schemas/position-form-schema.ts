import * as z from "zod";

export const positionFormSchema = z.object({
  name: z
    .string()
    .min(1, "Position name is required."),

  description: z
    .string()
    .min(1, "Description is required."),

  department: z.enum(
    [
      "management",
      "capital-markets",
      "deal-team",
      "legal-operations",
      "origination-pipe-public-markets",
    ],
    {
      required_error: "Department is required.",
      invalid_type_error: "Department is required.",
    }
  ),
});

export type PositionFormSchema = z.infer<typeof positionFormSchema>;
