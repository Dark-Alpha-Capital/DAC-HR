import type {
  InterviewBundleRoundStatus,
  RoundDeliveryMode,
} from "./enums";

/**
 * Pure round-progression logic for interview bundles.
 *
 * These functions hold the decision rules (which round is active, which is next,
 * when a bundle is done, how a delivery mode is coerced) so callers only deal
 * with the minimal shape they need. The repository and API routes act as
 * adapters: they map DB rows to {@link RoundProgress} and back.
 */
export interface RoundProgress {
  roundOrder: number;
  status: InterviewBundleRoundStatus;
}

export function toRoundProgress(
  bundleRound: { roundOrder: number; status: InterviewBundleRoundStatus },
): RoundProgress {
  return {
    roundOrder: bundleRound.roundOrder,
    status: bundleRound.status,
  };
}

function byRoundOrder<T extends RoundProgress>(rounds: T[]): T[] {
  return [...rounds].sort((a, b) => a.roundOrder - b.roundOrder);
}

/** Only `"voice"` survives as voice; everything else is a written form. */
export function coerceDeliveryMode(mode: unknown): RoundDeliveryMode {
  return mode === "voice" ? "voice" : "form";
}

/**
 * The round a candidate should be on: the first in-progress round, else the
 * first pending round (in round order), else none (bundle fully done).
 */
export function pickActiveRound<T extends RoundProgress>(
  rounds: T[],
): T | null {
  const ordered = byRoundOrder(rounds);
  return (
    ordered.find((r) => r.status === "in_progress") ??
    ordered.find((r) => r.status === "pending") ??
    null
  );
}

/** The next round to run after `afterOrder`, in round order. */
export function pickNextRound<T extends RoundProgress>(
  rounds: T[],
  afterOrder: number,
): T | null {
  return (
    byRoundOrder(rounds).find(
      (r) => r.roundOrder > afterOrder && r.status === "pending",
    ) ?? null
  );
}

/**
 * The 0-based index of the active round: the first in-progress round, else the
 * first pending round, else the final round (bundle fully done).
 */
export function currentRoundIndex(rounds: RoundProgress[]): number {
  const ordered = byRoundOrder(rounds);
  const inProgressIdx = ordered.findIndex((r) => r.status === "in_progress");
  if (inProgressIdx >= 0) return inProgressIdx;
  const pendingIdx = ordered.findIndex((r) => r.status === "pending");
  if (pendingIdx >= 0) return pendingIdx;
  return ordered.length > 0 ? ordered.length - 1 : 0;
}

/** True only when every round in the bundle is completed. */
export function allRoundsCompleted(rounds: RoundProgress[]): boolean {
  const ordered = byRoundOrder(rounds);
  return ordered.length > 0 && ordered.every((r) => r.status === "completed");
}
