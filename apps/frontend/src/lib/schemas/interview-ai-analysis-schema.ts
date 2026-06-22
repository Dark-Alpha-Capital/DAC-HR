import { z } from "zod";

/**
 * Comprehensive interview AI analysis schema for structured evaluation
 * Used by AI models to generate detailed interview assessments
 */
export const interviewAiAnalysisSchema = z.object({
  // Overall assessment
  score: z
    .number()
    .min(0)
    .max(10)
    .describe(
      "Overall numerical score from 0-10 indicating candidate's interview performance. Higher scores indicate stronger performance.",
    ),

  recommendation: z
    .enum(["Strong Hire", "Hire", "Neutral", "Do Not Hire"])
    .describe(
      "Overall hiring recommendation based on the interview evaluation",
    ),

  // Interview performance assessment
  interviewPerformance: z
    .object({
      score: z
        .number()
        .min(0)
        .max(10)
        .describe("Score from 0-10 for overall interview performance"),
      assessment: z
        .string()
        .describe(
          "Detailed assessment of how the candidate performed during the interview",
        ),
      highlights: z
        .array(z.string())
        .min(0)
        .describe(
          "Key highlights and strengths demonstrated during the interview",
        ),
      concerns: z
        .array(z.string())
        .min(0)
        .describe(
          "Concerns or areas of weakness observed during the interview",
        ),
    })
    .describe("Assessment of the candidate's interview performance"),

  // Position fit assessment
  positionFit: z
    .object({
      score: z
        .number()
        .min(0)
        .max(10)
        .describe(
          "Score from 0-10 for how well the candidate fits the position requirements based on interview responses",
        ),
      assessment: z
        .string()
        .describe(
          "Detailed assessment of how the interview responses align with position requirements",
        ),
      alignedRequirements: z
        .array(z.string())
        .min(0)
        .describe(
          "Position requirements that the candidate demonstrated alignment with",
        ),
      gaps: z
        .array(z.string())
        .min(0)
        .describe(
          "Position requirements where gaps were identified in the interview",
        ),
    })
    .describe(
      "Assessment of candidate's fit for the position based on interview",
    ),

  // Question-by-question analysis
  questionAnalysis: z
    .array(
      z.object({
        questionSummary: z
          .string()
          .describe("Brief summary of the interview question"),
        performanceLevel: z
          .enum(["Excellent", "Good", "Adequate", "Poor"])
          .describe("Performance level on this question"),
        notes: z
          .string()
          .describe(
            "Analysis notes about the candidate's response to this question",
          ),
      }),
    )
    .min(0)
    .describe("Question-by-question breakdown of interview performance"),

  // Overall summary
  overallSummary: z
    .string()
    .describe(
      "Comprehensive summary of the interview analysis and recommendation rationale",
    ),
});

export type InterviewAiAnalysisData = z.infer<typeof interviewAiAnalysisSchema>;
