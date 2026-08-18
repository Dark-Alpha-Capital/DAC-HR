import * as z from "zod";

export const candidateSourceEnum = z.enum(
  ["LinkedIn", "Upwork", "Handshake", "Indeed"],
  {
    message:
      "Invalid source. Only LinkedIn, Upwork, Handshake, and Indeed are supported as sources.",
  },
);

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
          // Remove common formatting characters (incl. brackets like [123])
          const cleaned = val.replace(/[\s\-()+.\[\]]/g, "");
          // Check if it's all digits and has reasonable length (7-15 digits)
          return /^\d{7,15}$/.test(cleaned);
        },
        {
          message:
            "Please enter a valid phone number (7-15 digits). Format: +1 (555) 123-4567 or 5551234567",
        },
      )
      .max(20, "Phone number must be at most 20 characters."),
    locationCity: z
      .string()
      .max(100, "City must be at most 100 characters.")
      .optional(),
    locationState: z
      .string()
      .max(2, "State must be a 2-letter abbreviation.")
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true;
          return /^[A-Za-z]{2}$/.test(val);
        },
        { message: "Invalid state abbreviation." },
      )
      .optional(),
    location: z.string().max(100, "Location must be at most 100 characters."),
    source: candidateSourceEnum.optional(),
    sourceUrl: z.string(),
    note: z.string().max(1000, "Note must be at most 1000 characters."),
    positionIds: z.array(z.string()),
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
    },
  );

export type CandidateFormSchema = z.infer<typeof candidateFormSchema>;
