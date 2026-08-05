import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { generateObject } from "ai";
import { z } from "zod";
import { getOpenAIProvider } from "@workspace/ai-config";
import {
  getResponsesBySessionId,
  getSessionById,
  upsertEvaluation,
  updateSessionStatus,
  getEvaluationBySessionId,
} from "@workspace/db/repositories/interview-session-repository";

type Env = {
  OPENAI_API_KEY: string;
};

type Params = {
  sessionId: string;
};

const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  recommendation: z.enum(["strong_hire", "hire", "maybe", "reject"]),
  summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  dimensionScores: z.record(z.string(), z.number()),
  perQuestionFeedback: z.array(
    z.object({
      questionId: z.string(),
      feedback: z.string(),
      score: z.number().min(0).max(10),
    }),
  ),
});

export class InterviewEvaluationWorkflow extends WorkflowEntrypoint<
  Env,
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { sessionId } = event.payload;

    const alreadyEvaluated = await step.do("check-existing-evaluation", async () => {
      return Boolean(await getEvaluationBySessionId(sessionId));
    });

    if (alreadyEvaluated) {
      return;
    }

    const context = await step.do("load-session-context", async () => {
      const row = await getSessionById(sessionId);
      if (!row) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const responses = await getResponsesBySessionId(sessionId);
      return { row, responses };
    });

    const evaluation = await step.do("generate-evaluation", async () => {
      const { row, responses } = context;
      const cheatingSummary = row.session.cheatingSummary;
      const responseBlock = responses
        .map((response, index) => {
          const answer =
            response.transcript ??
            response.answerText ??
            response.selectedOptionId ??
            "No answer";
          return `Q${index + 1} (${response.question.questionType}, input: ${response.inputMethod ?? "unknown"}): ${response.question.questionText}\nA: ${answer}`;
        })
        .join("\n\n");

      const { object } = await generateObject({
        model: getOpenAIProvider()("gpt-4o-mini"),
        schema: evaluationSchema,
        prompt: [
          "Evaluate this AI interview session for a hiring decision.",
          `Candidate: ${row.candidate.firstName} ${row.candidate.lastName}`,
          `Position: ${row.position.name}`,
          `Round: ${row.round.name}`,
          `Delivery mode: ${row.session.deliveryMode}`,
          cheatingSummary
            ? `Cheating signals: ${JSON.stringify(cheatingSummary)}. Penalize integrity risks in risks and recommendation.`
            : "No cheating signals recorded.",
          "Responses:",
          responseBlock,
        ].join("\n"),
      });

      return object;
    });

    await step.do("persist-evaluation", async () => {
      await upsertEvaluation({
        sessionId,
        score: evaluation.score,
        recommendation: evaluation.recommendation,
        summary: evaluation.summary,
        strengths: evaluation.strengths,
        risks: evaluation.risks,
        dimensionScores: evaluation.dimensionScores,
        perQuestionFeedback: evaluation.perQuestionFeedback,
      });

      await updateSessionStatus(sessionId, "reviewed");
    });
  }
}
