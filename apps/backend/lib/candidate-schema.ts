import * as z from "zod";

export const candidateSourceEnum = z.enum([
  "LinkedIn",
  "Upwork",
  "Handshake",
  "Indeed",
]);

export const candidateFormSchema = z
  .object({
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
    source: z.union([candidateSourceEnum, z.undefined()]),
    sourceUrl: z.string(),
    note: z.string().max(1000, "Note must be at most 1000 characters."),
    positionId: z.string(),
  })
  .refine(
    (data) => {
      // If source is provided, sourceUrl must also be provided and not empty
      if (data.source && (!data.sourceUrl || data.sourceUrl.trim() === "")) {
        return false;
      }
      // If sourceUrl is provided and not empty, source must also be provided
      if (data.sourceUrl && data.sourceUrl.trim() !== "" && !data.source) {
        return false;
      }
      // If sourceUrl is provided, it must be a valid URL
      if (data.sourceUrl && data.sourceUrl.trim() !== "") {
        try {
          new URL(data.sourceUrl);
          return true;
        } catch {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "Source URL is required when source is selected and must be a valid URL.",
      path: ["sourceUrl"],
    }
  );

export type CandidateFormSchema = z.infer<typeof candidateFormSchema>;

export const candidateDocumentFormSchema = z.object({
  name: z
    .string()
    .min(1, "Document name is required.")
    .max(255, "Document name must be at most 255 characters."),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters."),
  category: z.enum(["resume", "cover-letter", "portfolio", "other"]),
  url: z
    .string()
    .refine(
      (val) => val === "" || z.string().url().safeParse(val).success,
      "Invalid URL format."
    ),
  tags: z.array(z.string()),
});

export type CandidateDocumentFormSchema = z.infer<
  typeof candidateDocumentFormSchema
>;

