import * as z from "zod";

export const candidateFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required.")
    .max(50, "First name must be at most 50 characters."),
  lastName: z
    .string()
    .min(1, "Last name is required.")
    .max(50, "Last name must be at most 50 characters."),
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  phone: z.string().max(15, "Phone number must be at most 15 characters."),
  location: z.string().max(100, "Location must be at most 100 characters."),
  source: z.string().max(100, "Source must be at most 100 characters."),
  note: z.string().max(1000, "Note must be at most 1000 characters."),
  positionId: z.string(),
});

export type CandidateFormSchema = z.infer<typeof candidateFormSchema>;
