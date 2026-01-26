import { z } from "zod";

/**
 * Comprehensive candidate AI screening schema for structured evaluation
 * Used by AI models to generate detailed candidate assessments
 */
export const candidateAiScreeningSchema = z.object({
  // Overall assessment
  score: z
    .number()
    .min(0)
    .max(10)
    .describe(
      "Overall numerical score from 0-10 indicating candidate suitability for the position. Higher scores indicate stronger fit.",
    ),

  recommendation: z
    .enum(["Strong Hire", "Hire", "Neutral", "Do Not Hire"])
    .describe(
      "Overall hiring recommendation based on the comprehensive evaluation",
    ),

  // Strengths and weaknesses
  strengths: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "Brief title or category of the strength (e.g., 'Quantitative Skills')",
          ),
        description: z
          .string()
          .describe(
            "Detailed description of why this is a strength with specific examples",
          ),
      }),
    )
    .min(0)
    .describe(
      "List of candidate strengths relevant to the position. Include specific examples from their background.",
    ),

  concerns: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "Brief title or category of the concern (e.g., 'Limited Buy-Side Experience')",
          ),
        description: z
          .string()
          .describe(
            "Detailed description of the concern and its potential impact",
          ),
        severity: z
          .enum(["Low", "Medium", "High"])
          .describe("Severity level of the concern"),
      }),
    )
    .min(0)
    .describe(
      "List of concerns or potential weaknesses. Be specific and constructive.",
    ),

  // Fit assessments
  experienceFit: z
    .object({
      score: z
        .number()
        .min(0)
        .max(10)
        .describe(
          "Score from 0-10 for how well candidate's experience matches the role",
        ),
      assessment: z
        .string()
        .describe(
          "Detailed assessment of how candidate's experience aligns with position requirements",
        ),
      relevantExperience: z
        .array(z.string())
        .min(0)
        .describe(
          "List of relevant experiences that demonstrate fit for the role",
        ),
      gaps: z
        .array(z.string())
        .min(0)
        .describe(
          "List of experience gaps or areas where candidate lacks relevant experience",
        ),
    })
    .describe("Assessment of candidate's experience fit for the position"),

  skillsFit: z
    .object({
      score: z
        .number()
        .min(0)
        .max(10)
        .describe(
          "Score from 0-10 for how well candidate's skills match the role requirements",
        ),
      assessment: z
        .string()
        .describe(
          "Detailed assessment of candidate's technical and soft skills",
        ),
      strongSkills: z
        .array(z.string())
        .min(0)
        .describe("List of skills where candidate demonstrates strength"),
      developingSkills: z
        .array(z.string())
        .min(0)
        .describe("List of skills that need development or are missing"),
    })
    .describe(
      "Assessment of candidate's skills alignment with position requirements",
    ),
});
