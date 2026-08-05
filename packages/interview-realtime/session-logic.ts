/**
 * Pure session logic for the voice interview Durable Object — no DO runtime,
 * no db, no WebSocket. Deterministic and directly unit-testable.
 */
import type { CheatingSummary } from "@workspace/db/enums";
import type { InterviewQuestion } from "./types";

/**
 * Match a spoken answer against MCQ options. Returns the matched option id or
 * null. Recognizes "option a", "a)", a leading letter, or the option text.
 */
export function matchMcqOption(
  question: InterviewQuestion,
  transcript: string,
): string | null {
  if (question.questionType !== "mcq" || !question.options?.length) {
    return null;
  }

  const normalized = transcript.toLowerCase();
  for (let index = 0; index < question.options.length; index++) {
    const option = question.options[index]!;
    const letter = String.fromCharCode(65 + index).toLowerCase();
    if (
      normalized.includes(`option ${letter}`) ||
      normalized.startsWith(`${letter} `) ||
      normalized.includes(option.text.toLowerCase())
    ) {
      return option.id;
    }
  }

  return null;
}

/**
 * Best-effort detection of which question the assistant is currently reading,
 * by overlapping transcript text against each question's text / MCQ options.
 * Returns the index, or null when no confident match (score below threshold).
 */
export function detectQuestionIndexFromTranscript(
  questions: InterviewQuestion[],
  transcript: string,
): number | null {
  const normalized = transcript.toLowerCase().replace(/\s+/g, " ");
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let index = 0; index < questions.length; index++) {
    const question = questions[index]!;
    const questionText = question.questionText.toLowerCase().trim();
    if (!questionText) {
      continue;
    }

    const snippet = questionText.slice(0, Math.min(80, questionText.length));
    let score = 0;

    if (normalized.includes(snippet)) {
      score = snippet.length;
    } else {
      const words = snippet.split(/\s+/).filter((word) => word.length > 4);
      const matched = words.filter((word) => normalized.includes(word)).length;
      if (words.length > 0 && matched / words.length >= 0.5) {
        score = matched * 10;
      }
    }

    if (question.questionType === "mcq" && question.options?.length) {
      for (const option of question.options) {
        const optionText = option.text.toLowerCase().trim();
        if (optionText.length > 8 && normalized.includes(optionText.slice(0, 40))) {
          score += 20;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore >= 20 ? bestIndex : null;
}

/** Build the persisted cheating summary from the raw counters map. */
export function buildCheatingSummary(
  counters: Record<string, number>,
): CheatingSummary {
  return {
    tabSwitches: counters.TAB_SWITCHED ?? 0,
    focusLostSeconds: counters.focusLostSeconds ?? 0,
    fullscreenExits: counters.FULLSCREEN_EXITED ?? 0,
    copyAttempts: counters.COPY_ATTEMPT ?? 0,
    pasteAttempts: counters.PASTE_ATTEMPT ?? 0,
  };
}
