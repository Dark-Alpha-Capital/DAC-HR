import { z } from "zod";

// Simplified schema - just score and analysis
export const candidateAiScreeningSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(10)
    .describe("Numerical score out of 10 indicating candidate suitability"),
  analysis: z.string().describe("Complete markdown analysis report"),
});
