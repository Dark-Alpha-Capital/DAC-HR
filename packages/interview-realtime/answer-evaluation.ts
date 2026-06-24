import type { InterviewQuestion } from "./types";

export const MAX_ANSWER_FOLLOW_UPS = 3;
const EVALUATION_MODEL = "gpt-4o-mini";

export type AnswerRelevance =
  | "on_topic"
  | "partial"
  | "off_topic"
  | "refusal"
  | "unclear"
  | "noise";

export type IntroEvaluationResult = {
  ready: boolean;
  relevance: "ready" | "unclear" | "noise" | "other";
  followUpInstruction: string | null;
};

const NOISE_TRANSCRIPTION_MARKERS =
  /\[(?:inaudible|music|silence|laughter|applause|noise|crosstalk|background)\]/i;

const FILLER_ONLY =
  /^(?:um+|uh+|hmm+|ah+|er+|oh+|mm+|mhm+|uh-huh+|huh)\.?$/i;

const READY_PHRASES =
  /\b(?:yes|yeah|yep|yup|sure|ready|let'?s go|go ahead|start|begin|i am|i'm ready|absolutely|definitely|ok(?:ay)?|sounds good)\b/i;

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

export function looksLikeNoise(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  if (NOISE_TRANSCRIPTION_MARKERS.test(trimmed)) {
    return true;
  }

  if (FILLER_ONLY.test(trimmed)) {
    return true;
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 1 && trimmed.length <= 3) {
    return true;
  }

  const alphaChars = trimmed.replace(/[^a-zA-Z]/g, "");
  if (alphaChars.length >= 6) {
    const vowels = alphaChars.replace(/[^aeiouAEIOU]/g, "").length;
    if (vowels / alphaChars.length < 0.15) {
      return true;
    }
  }

  return false;
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
      relevance === "unclear" ||
      relevance === "noise";

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

  if (!normalized || looksLikeNoise(combinedAnswer)) {
    return {
      sufficient: false,
      relevance: "noise",
      followUpInstruction:
        "You heard background noise or an unclear sound instead of an answer. Ask the candidate to move to a quieter environment and try again. Do not advance to the next question.",
      combinedAnswer,
    };
  }

  if (wordCount <= 2 && !looksLikeReadyConfirmation(normalized)) {
    return {
      sufficient: false,
      relevance: "unclear",
      followUpInstruction:
        "You did not catch a clear answer. Rephrase the same question in different words and ask them to answer again.",
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
            "Return JSON only with keys: sufficient (boolean), relevance (on_topic|partial|off_topic|refusal|unclear|noise), followUpInstruction (string|null), combinedAnswer (string).",
            "Mark sufficient=true only when the candidate has given a substantive answer that addresses the question.",
            "Mark sufficient=false when the answer is unrelated, evasive, a non-answer, nonsense, or too vague to evaluate.",
            "Mark relevance=noise for background sounds, gibberish, filler-only utterances, or transcription artifacts — do NOT treat these as answers.",
            "For noise: followUpInstruction must ask the candidate to find a quieter environment and try again.",
            "For unclear answers: followUpInstruction must rephrase the same question in different words — do not advance.",
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

function looksLikeReadyConfirmation(text: string): boolean {
  return READY_PHRASES.test(text.trim());
}

function fallbackIntroEvaluation(utterance: string): IntroEvaluationResult {
  const trimmed = utterance.trim();

  if (!trimmed || looksLikeNoise(trimmed)) {
    return {
      ready: false,
      relevance: "noise",
      followUpInstruction:
        "You heard background noise instead of a clear response. Ask the candidate to move to a quieter environment, then ask if they are ready to begin.",
    };
  }

  if (looksLikeReadyConfirmation(trimmed)) {
    return {
      ready: true,
      relevance: "ready",
      followUpInstruction: null,
    };
  }

  if (trimmed.split(/\s+/).filter(Boolean).length <= 3) {
    return {
      ready: false,
      relevance: "unclear",
      followUpInstruction:
        "You did not hear a clear confirmation. Ask again if they are ready to begin the interview.",
    };
  }

  return {
    ready: false,
    relevance: "other",
    followUpInstruction:
      "Acknowledge what they said briefly, then ask again if they are ready to begin the interview.",
  };
}

export async function evaluateIntroUtterance(options: {
  apiKey: string;
  utterance: string;
}): Promise<IntroEvaluationResult> {
  const { apiKey, utterance } = options;
  const trimmed = utterance.trim();

  if (!apiKey.trim()) {
    return fallbackIntroEvaluation(trimmed);
  }

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
            "You evaluate whether a job candidate confirmed they are ready to start a voice interview.",
            "Return JSON only with keys: ready (boolean), relevance (ready|unclear|noise|other), followUpInstruction (string|null).",
            "Mark ready=true only when they clearly confirm readiness (e.g. yes, I'm ready, let's begin).",
            "Mark relevance=noise for background sounds, gibberish, or filler-only utterances.",
            "For noise: followUpInstruction asks them to find a quieter environment, then confirm readiness.",
            "For unclear: followUpInstruction asks again if they are ready to begin.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Candidate utterance: ${trimmed}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return fallbackIntroEvaluation(trimmed);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return fallbackIntroEvaluation(trimmed);
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const relevance = parsed.relevance;
    const validRelevance =
      relevance === "ready" ||
      relevance === "unclear" ||
      relevance === "noise" ||
      relevance === "other";

    if (!validRelevance || typeof parsed.ready !== "boolean") {
      return fallbackIntroEvaluation(trimmed);
    }

    return {
      ready: parsed.ready,
      relevance,
      followUpInstruction:
        typeof parsed.followUpInstruction === "string"
          ? parsed.followUpInstruction
          : null,
    };
  } catch {
    return fallbackIntroEvaluation(trimmed);
  }
}
