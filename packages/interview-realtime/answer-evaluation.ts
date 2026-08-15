import type { InterviewQuestion, JsonObject } from "./types";
import { interviewServerLog } from "./debug-log";
import { z } from "zod";

/**
 * Max consecutive unclear-audio/noise follow-ups before the interview advances
 * regardless. OpenAI's realtime prompting guidance says don't repeat the same
 * clarification more than twice, so after this many we treat the question as
 * answered (best-effort) and move on.
 */
export const MAX_NOISE_RETRIES = 2;

/** @deprecated Use MAX_NOISE_RETRIES — kept for existing imports */
export const MAX_ANSWER_FOLLOW_UPS = MAX_NOISE_RETRIES;

export const NOISE_ENVIRONMENT_INSTRUCTION =
  "Politely ask the candidate to please ensure their surroundings are stable and silenced, then repeat the current question. Do not advance to the next question.";
const EVALUATION_MODEL = "gpt-4o-mini";
const EVAL_COMPONENT = "answer-evaluation";

function logEvaluation(
  action: string,
  data: JsonObject = {},
  level: "info" | "warn" | "error" = "info",
): void {
  interviewServerLog[level]("eval", EVAL_COMPONENT, action, data);
}

type ChatCompletionsPayload = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function parseChatCompletionsResponse(
  response: Response,
  context: string,
): Promise<ChatCompletionsPayload | null> {
  const contentType = response.headers.get("content-type") ?? "";
  let bodyText: string;

  try {
    bodyText = await response.text();
  } catch (error) {
    logEvaluation("response_body_read_failed", {
      context,
      status: response.status,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (!bodyText.trim()) {
    logEvaluation("response_body_empty", {
      context,
      status: response.status,
      contentType,
    });
    return null;
  }

  try {
    // SAFETY: chat completions responses are JSON with the documented
    // `choices[].message.content` shape; the cast narrows the parsed body.
    return JSON.parse(bodyText) as ChatCompletionsPayload;
  } catch (error) {
    logEvaluation("response_json_parse_failed", {
      context,
      status: response.status,
      contentType,
      bodyPreview: bodyText.slice(0, 200),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

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

const SHORT_VALID_SPOKEN =
  /^(?:yes|no|yeah|yep|nope|yup|ok|okay|[a-d])\.?$/i;

const READY_PHRASES =
  /\b(?:yes|yeah|yep|yup|sure|ready|let'?s go|go ahead|start|begin|i am|i'm ready|absolutely|definitely|ok(?:ay)?|sounds good)\b/i;

const READY_INTENT_PHRASES =
  /\b(?:can we|can you|are you|shall we|could we|may we)\b.*\b(?:begin|start|go|ready|hear|proceed)\b/i;

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
  if (
    wordCount <= 1 &&
    trimmed.length <= 3 &&
    !SHORT_VALID_SPOKEN.test(trimmed)
  ) {
    return true;
  }

  // Single short words are often mis-transcribed background noise (e.g. "peace", "please").
  if (wordCount === 1) {
    const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, "");
    if (
      lettersOnly.length > 0 &&
      lettersOnly.length <= 6 &&
      !looksLikeReadyConfirmation(trimmed) &&
      !SHORT_VALID_SPOKEN.test(trimmed)
    ) {
      return true;
    }
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

const answerEvaluationSchema = z.object({
  sufficient: z.boolean(),
  relevance: z.enum([
    "on_topic",
    "partial",
    "off_topic",
    "refusal",
    "unclear",
    "noise",
  ]),
  followUpInstruction: z.string().nullable().catch(null),
  combinedAnswer: z
    .string()
    .catch("")
    .transform((s) => s.trim()),
});

function parseEvaluationJson(raw: string): AnswerEvaluationResult | null {
  try {
    const parsed = answerEvaluationSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function fallbackEvaluation(
  _question: InterviewQuestion,
  utterances: string[],
  followUpCount: number,
): AnswerEvaluationResult {
  const combinedAnswer = mergeAnswerUtterances(utterances);
  const normalized = combinedAnswer.toLowerCase().trim();

  if (followUpCount >= MAX_NOISE_RETRIES) {
    return {
      sufficient: true,
      relevance: "noise",
      followUpInstruction: null,
      combinedAnswer,
    };
  }

  if (!normalized || looksLikeNoise(combinedAnswer)) {
    return {
      sufficient: false,
      relevance: "noise",
      followUpInstruction: NOISE_ENVIRONMENT_INSTRUCTION,
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

  if (followUpCount >= MAX_NOISE_RETRIES) {
    return {
      sufficient: true,
      relevance: "noise",
      followUpInstruction: null,
      combinedAnswer,
    };
  }

  if (looksLikeNoise(latestUtterance)) {
    logEvaluation("noise_short_circuit", {
      questionId: question.id,
      followUpCount,
      utterancePreview: latestUtterance.trim().slice(0, 80),
    });
    return fallbackEvaluation(question, allUtterances, followUpCount);
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
            "You evaluate whether a job candidate's spoken answer should advance the interview.",
            "Return JSON only with keys: sufficient (boolean), relevance (on_topic|partial|off_topic|refusal|unclear|noise), followUpInstruction (string|null), combinedAnswer (string).",
            "Mark sufficient=true for ANY substantive spoken response — including wrong, off-topic, incomplete, vague, or incorrect MCQ answers. Never ask the candidate to try again for content reasons.",
            "Mark sufficient=false ONLY for noise: background sounds, gibberish, filler-only utterances, random unrelated single words, or transcription artifacts — not real attempts to answer.",
            "For noise: set followUpInstruction to ask the candidate to please ensure their surroundings are stable and silenced, then repeat the current question.",
            "For all sufficient answers: followUpInstruction must be null.",
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
    const errorBody = await response.text().catch(() => "");
    logEvaluation("answer_eval_http_error", {
      status: response.status,
      questionId: question.id,
      bodyPreview: errorBody.slice(0, 200),
    });
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  const payload = await parseChatCompletionsResponse(response, "answer_eval");
  if (!payload) {
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  const parsed = parseEvaluationJson(content);
  if (!parsed) {
    return fallbackEvaluation(question, allUtterances, followUpCount);
  }

  const isNoise = parsed.relevance === "noise";

  const result = {
    ...parsed,
    combinedAnswer: parsed.combinedAnswer || combinedAnswer,
    sufficient: !isNoise,
    followUpInstruction: isNoise
      ? (parsed.followUpInstruction ?? NOISE_ENVIRONMENT_INSTRUCTION)
      : null,
  };
  interviewServerLog.success("eval", EVAL_COMPONENT, "answer_evaluated", {
    questionId: question.id,
    relevance: result.relevance,
    sufficient: result.sufficient,
    followUpCount,
  });
  return result;
}

function looksLikeReadyConfirmation(text: string): boolean {
  const trimmed = text.trim();
  return READY_PHRASES.test(trimmed) || READY_INTENT_PHRASES.test(trimmed);
}

function fallbackIntroEvaluation(utterance: string): IntroEvaluationResult {
  const trimmed = utterance.trim();

  if (!trimmed || looksLikeNoise(trimmed)) {
    return {
      ready: false,
      relevance: "noise",
      followUpInstruction: null,
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

  if (looksLikeNoise(trimmed)) {
    logEvaluation("noise_short_circuit", {
      context: "intro",
      utterancePreview: trimmed.slice(0, 80),
    });
    return fallbackIntroEvaluation(trimmed);
  }

  if (looksLikeReadyConfirmation(trimmed)) {
    logEvaluation("ready_short_circuit", {
      utterancePreview: trimmed.slice(0, 80),
    });
    return {
      ready: true,
      relevance: "ready",
      followUpInstruction: null,
    };
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
    const errorBody = await response.text().catch(() => "");
    logEvaluation("intro_eval_http_error", {
      status: response.status,
      bodyPreview: errorBody.slice(0, 200),
    });
    return fallbackIntroEvaluation(trimmed);
  }

  const payload = await parseChatCompletionsResponse(response, "intro_eval");
  if (!payload) {
    return fallbackIntroEvaluation(trimmed);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return fallbackIntroEvaluation(trimmed);
  }

  try {
    const introEvaluationSchema = z.object({
      ready: z.boolean(),
      relevance: z.enum(["ready", "unclear", "noise", "other"]),
      followUpInstruction: z.string().nullable().catch(null),
    });
    const parsed = introEvaluationSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return fallbackIntroEvaluation(trimmed);
    }

    const introResult: IntroEvaluationResult = parsed.data;
    interviewServerLog.success("eval", EVAL_COMPONENT, "intro_evaluated", {
      ready: introResult.ready,
      relevance: introResult.relevance,
    });
    return introResult;
  } catch {
    return fallbackIntroEvaluation(trimmed);
  }
}
