import type { RoundDeliveryMode } from "#/lib/enums";
import type { VoiceInterviewPhase } from "@workspace/interview-realtime/types";

/**
 * Pure flow-planning for the candidate-facing interview page.
 *
 * Holds the decision rules for what the page should show and how the next
 * round's mode is chosen, so the route stays a thin renderer and the round-mode
 * decision is always testable. The authoritative source for the next round is
 * the server response (complete / validate), never a re-derivation on the
 * client.
 */
export type SessionMode = "form" | "voice";

export function toSessionMode(
  deliveryMode: RoundDeliveryMode | "hybrid" | undefined,
): SessionMode {
  return deliveryMode === "voice" ? "voice" : "form";
}

export interface NextRoundInfo {
  roundName: string;
  roundOrder: number;
  deliveryMode: RoundDeliveryMode;
  sessionId?: string | null;
}

export interface RoundTransitionData {
  completedPart: number;
  nextPart: number;
  nextRoundName: string;
  totalParts: number;
  /** Authoritative per-round mode from the server. */
  deliveryMode: RoundDeliveryMode;
  /** Authoritative session id for the next round (cache key / voice start). */
  sessionId: string | null;
  /** Client rendering mode derived from {@link deliveryMode}. */
  sessionMode: SessionMode;
}

/** Plan the transition slide from the complete endpoint's `nextRound`. */
export function planRoundTransition(
  nextRound: NextRoundInfo,
  totalParts: number,
): RoundTransitionData {
  const nextPart = nextRound.roundOrder + 1;
  return {
    completedPart: nextPart - 1,
    nextPart,
    nextRoundName: nextRound.roundName,
    totalParts: Math.max(totalParts, nextPart),
    deliveryMode: nextRound.deliveryMode,
    sessionId: nextRound.sessionId ?? null,
    sessionMode: toSessionMode(nextRound.deliveryMode),
  };
}

/** Plan the transition slide from a pending round in the validate response. */
export function planNextRoundFromValidation(
  pendingRound: NextRoundInfo,
  totalRounds: number,
  currentRoundIndex: number,
): RoundTransitionData {
  const nextPart = currentRoundIndex + 1;
  return {
    completedPart: nextPart - 1,
    nextPart,
    nextRoundName: pendingRound.roundName,
    totalParts: totalRounds,
    deliveryMode: pendingRound.deliveryMode,
    sessionId: pendingRound.sessionId ?? null,
    sessionMode: toSessionMode(pendingRound.deliveryMode),
  };
}

/** True when the candidate page should render the realtime voice UI. */
export function isVoiceRound(
  deliveryMode: RoundDeliveryMode | "hybrid" | undefined,
): boolean {
  return deliveryMode === "voice";
}

/** True during the welcome/intro phases (before questions begin). */
export function isIntroPhase(phase: VoiceInterviewPhase): boolean {
  return (
    phase === "intro" || phase === "awaiting_ready" || phase === "intro_ready"
  );
}

/** True once questions are being asked or winding down. */
export function isQuestionPhase(phase: VoiceInterviewPhase): boolean {
  return (
    phase === "questions" || phase === "closing" || phase === "awaiting_end"
  );
}
