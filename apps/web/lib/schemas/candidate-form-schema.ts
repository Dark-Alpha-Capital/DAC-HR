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
  phone: z
    .string()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Allow empty phone numbers
        // Remove common formatting characters
        const cleaned = val.replace(/[\s\-\(\)\+\.]/g, "");
        // Check if it's all digits and has reasonable length (7-15 digits)
        return /^\d{7,15}$/.test(cleaned);
      },
      {
        message:
          "Please enter a valid phone number (7-15 digits). Format: +1 (555) 123-4567 or 5551234567",
      }
    )
    .max(20, "Phone number must be at most 20 characters."),
  location: z.string().max(100, "Location must be at most 100 characters."),
  source: z.string().max(100, "Source must be at most 100 characters."),
  note: z.string().max(1000, "Note must be at most 1000 characters."),
  positionId: z.string(),
});

export type CandidateFormSchema = z.infer<typeof candidateFormSchema>;
