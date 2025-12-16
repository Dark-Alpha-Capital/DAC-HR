import { z } from "zod";

export const candidateAiScreeningSchema = z.object({
  verdict: z
    .enum(["Strong Hire", "Hire", "Neutral / On the Fence", "Do Not Hire"])
    .describe("Overall hiring recommendation"),
  score: z
    .number()
    .min(0)
    .max(10)
    .describe("Numerical score out of 10 indicating candidate suitability"),
  explanation: z
    .string()
    .describe("Generic explanation of the verdict and score"),
  fullAnalysis: z.string().describe("Complete markdown analysis report"),
});
