/**
 * Pure policy and decision rules for a voice interview session.
 *
 * These constants and pure functions own the tunable behaviour of the voice
 * session state machine — VAD tuning, thinking-silence cues, closing
 * auto-completion, reconnect grace, close-code handling, and backoff schedules.
 * The Interview Session DO is the adapter: it applies these decisions against
 * its storage, alarms, sideband, and D1, and stays free of magic numbers.
 *
 * Keeping this module pure makes the exact policies behind the "premature
 * advance" and "unclean termination" failures unit-testable.
 */

// ---------------------------------------------------------------------------
// VAD (OpenAI server-side voice activity detection)
// ---------------------------------------------------------------------------

/**
 * Which turn-detection mode to use.
 *
 * - `server_vad`: chunks on periods of silence (threshold / prefix / silence).
 * - `semantic_vad`: a semantic classifier ends the turn only when the model
 *   believes the user is done — with `eagerness: "low"` it lets candidates
 *   pause to think without prematurely ending the turn. Recommended for
 *   interviews where thinking pauses are expected.
 */
export const VAD_MODE: "semantic_vad" | "server_vad" = "semantic_vad";

/** Only used by `server_vad`. */
export const VAD_SILENCE_DURATION_MS = 1600;
export const VAD_THRESHOLD = 0.6;
export const VAD_PREFIX_PADDING_MS = 400;

/** Only used by `semantic_vad`; `low` lets the speaker take their time. */
export const VAD_EAGERNESS: "auto" | "low" | "medium" | "high" = "low";

// ---------------------------------------------------------------------------
// Timeouts
// ---------------------------------------------------------------------------

export const QUESTION_TIMEOUT_DEFAULT_SECONDS = 180;
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
export const SESSION_TIMEOUT_GRACE_MS = 60 * 1000;

/**
 * When a client WebSocket drops, wait this long for a reattachment before
 * marking the session interrupted. Covers transient network blips + reloads.
 */
export const RECONNECT_GRACE_MS = 30_000;

// ---------------------------------------------------------------------------
// Sideband (DO → OpenAI Realtime) reconnect policy
// ---------------------------------------------------------------------------

export const SIDEBAND_CONNECT_MAX_RETRIES = 3;
export const SIDEBAND_RECONNECT_MAX_ATTEMPTS = 5;
export const SIDEBAND_BACKOFF_BASE_MS = 1000;
export const SIDEBAND_BACKOFF_MAX_MS = 30_000;

/** Exponential backoff for reconnect attempts (attempt starts at 0). */
export function nextBackoffDelayMs(attempt: number): number {
  return Math.min(
    SIDEBAND_BACKOFF_BASE_MS * 2 ** Math.max(attempt, 0),
    SIDEBAND_BACKOFF_MAX_MS,
  );
}

// ---------------------------------------------------------------------------
// Client WebSocket close handling
// ---------------------------------------------------------------------------

export const WS_CLOSE_NORMAL = 1000;
export const WS_CLOSE_GOING_AWAY = 1001;

/**
 * Whether a closed client WebSocket should mark the session interrupted.
 *
 * A clean close (1000) or page unload (1001) means the candidate left; the
 * caller decides whether to wait out the reconnect grace before acting. Server
 * error closes (1011/1012) are interrupted too. Completed/practice sessions
 * are never interrupted.
 */
export function shouldMarkInterrupted(
  closeCode: number,
  status: string,
  isPractice: boolean,
): boolean {
  if (isPractice) {
    return false;
  }
  if (status === "completed") {
    return false;
  }
  return true;
}
