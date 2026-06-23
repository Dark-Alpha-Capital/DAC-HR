import type { InterviewQuestion } from "./types";

export const MAX_ANSWER_FOLLOW_UPS = 3;
const EVALUATION_MODEL = "gpt-4o-mini";

export type AnswerRelevance =
  | "on_topic"
  | "partial"
  | "off_topic"
  | "refusal"
  | "unclear";

export type AnswerEvaluationResult = {
  sufficient: boolean;
  relevance: AnswerRelevance;
  followUpInstruction: string | null;
  combinedAnswer: string;
};

export function mergeAnswerUtterances(utterances: string[]): string {
  return utterances
    .map((utterance) => utterance.trim())
    .filter(Boolean)
    .join(" ");
}

function formatQuestionForEvaluation(question: InterviewQuestion): string {
  if (question.questionType === "mcq" && question.options?.length) {
    const options = question.options
      .map((option, index) => {
        const label = String.fromCharCode(65 + index);
        return `${label}) ${option.text}`;
      })
      .join("; ");
    return `${question.questionText} (MCQ — options: ${options})`;
  }

  return question.questionText;
}

function parseEvaluationJson(raw: string): AnswerEvaluationResult | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const relevance = parsed.relevance;
    const validRelevance =
      relevance === "on_topic" ||
      relevance === "partial" ||
      relevance === "off_topic" ||
      relevance === "refusal" ||
      relevance === "unclear";

    if (!validRelevance || typeof parsed.sufficient !== "boolean") {
      return null;
    }

    return {
      sufficient: parsed.sufficient,
      relevance,
      followUpInstruction:
        typeof parsed.followUpInstruction === "string"
          ? parsed.followUpInstruction
          : null,
      combinedAnswer:
        typeof parsed.combinedAnswer === "string"
          ? parsed.combinedAnswer.trim()
          : "",
    };
  } catch {
    return null;
  }
}

function fallbackEvaluation(
  question: InterviewQuestion,
  utterances: string[],
  followUpCount: number,
): AnswerEvaluationResult {
  const combinedAnswer = mergeAnswerUtterances(utterances);
  const normalized = combinedAnswer.toLowerCase().trim();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  if (followUpCount >= MAX_ANSWER_FOLLOW_UPS) {
    return {
      sufficient: true,
      relevance: "partial",
      followUpInstruction: null,
      combinedAnswer,
    };
  }

  if (!normalized) {
    return {
      sufficient: false,
      relevance: "unclear",
      followUpInstruction:
        "Politely note you did not catch a clear answer and ask them to respond to the question again.",
      combinedAnswer,
    };
  }

  if (
    question.questionType === "mcq" &&
    question.options?.length &&
    wordCount <= 6
  ) {
    const hasOptionHint = question.options.some((option, index) => {
      const letter = String.fromCharCode(65 + index).toLowerCase();
      return (
        normalized.includes(`option ${letter}`) ||
        normalized.startsWith(`${letter}`) ||
        normalized.includes(option.text.toLowerCase())
      );
    });

    if (!hasOptionHint) {
      return {
        sufficient: false,
        relevance: "unclear",
        followUpInstruction:
          "Ask them to choose one of the listed options by letter (A, B, C, etc.) or by stating the option clearly.",
        combinedAnswer,
      };
    }
  }

  if (wordCount < 4) {
    return {
      sufficient: false,
      relevance: "partial",
      followUpInstruction:
        "Their answer was very brief. Ask a short follow-up so they can expand with a concrete example or detail.",
      combinedAnswer,
    };
  }

  return {
    sufficient: true,
    relevance: "on_topic",
    followUpInstruction: null,
    combinedAnswer,
  };
}

export async function evaluateCandidateAnswer(options: {
  apiKey: string;
  question: InterviewQuestion;
  latestUtterance: string;
  priorUtterances?: string[];
  followUpCount?: number;
}): Promise<AnswerEvaluationResult> {
  const {
    apiKey,
    question,
    latestUtterance,
    priorUtterances = [],
    followUpCount = 0,
  } = options;

  const allUtterances = [...priorUtterances, latestUtterance];
  const combinedAnswer = mergeAnswerUtterances(allUtterances);

  if (followUpCount >= MAX_ANSWER_FOLLOW_UPS) {
    return {
      sufficient: true,
      relevance: "partial",
      followUpInstruction: null,
      combinedAnswer,
    };
  }

  if (!apiKey.trim()) {
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  const questionText = formatQuestionForEvaluation(question);
  const priorBlock =
    priorUtterances.length > 0
      ? `Prior attempts for this question:\n${priorUtterances.map((utterance, index) => `${index + 1}. ${utterance}`).join("\n")}\n`
      : "";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EVALUATION_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You evaluate whether a job candidate's spoken answer is good enough to move on in a structured interview.",
            "Return JSON only with keys: sufficient (boolean), relevance (on_topic|partial|off_topic|refusal|unclear), followUpInstruction (string|null), combinedAnswer (string).",
            "Mark sufficient=true only when the candidate has given a substantive answer that addresses the question.",
            "Mark sufficient=false when the answer is unrelated, evasive, a non-answer, nonsense, or too vague to evaluate.",
            "For MCQ questions, sufficient=true only if they clearly pick an option by letter or option text.",
            "If sufficient=false, followUpInstruction must be a concise instruction for the voice interviewer on what to say next to redirect or clarify — stay on the same question.",
            "combinedAnswer should merge all prior attempts plus the latest utterance into one coherent answer transcript.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Question: ${questionText}`,
            priorBlock,
            `Latest candidate utterance: ${latestUtterance.trim()}`,
            `Follow-up attempts so far: ${followUpCount}`,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  const parsed = parseEvaluationJson(content);
  if (!parsed) {
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  return {
    ...parsed,
    combinedAnswer: parsed.combinedAnswer || combinedAnswer,
    followUpInstruction: parsed.sufficient ? null : parsed.followUpInstruction,
  };
}
