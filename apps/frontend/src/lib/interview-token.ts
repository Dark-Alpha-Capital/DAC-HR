import {
  resolveSessionFromToken,
  type TokenValidationResult,
} from "@workspace/db/repositories/interview-bundle-repository";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";

const COMPONENT = "interview-token";

type ResolvedSessionOk = Extract<
  Awaited<ReturnType<typeof resolveSessionFromToken>>,
  { ok: true }
>;

type ResolvedInterviewSession = ResolvedSessionOk["session"];

export type ResolvedInterviewToken =
  | {
      ok: true;
      type: "legacy";
      session: ResolvedInterviewSession;
      candidate: { firstName: string; lastName: string };
      position: { name: string };
      round: { name: string };
    }
  | {
      ok: true;
      type: "bundle";
      session: ResolvedInterviewSession;
      candidate: { firstName: string; lastName: string };
      position: { name: string };
      round: { name: string };
      bundleToken: string;
      currentRoundIndex: number;
      totalRounds: number;
      deliveryMode: "form" | "voice";
      rounds: Extract<
        TokenValidationResult,
        { ok: true; type: "bundle" }
      >["rounds"];
    }
  | { ok: false; status: number; error: string };

export async function resolveInterviewToken(
  token: string,
): Promise<ResolvedInterviewToken> {
  interviewServerLog.info("validate", COMPONENT, "resolve_start", {
    token: truncateId(token),
  });

  const resolved = await resolveSessionFromToken(token);

  if (!resolved.ok) {
    interviewServerLog.warn("validate", COMPONENT, "resolve_failed", {
      token: truncateId(token),
      status: resolved.status,
      error: resolved.error,
    });
    return { ok: false, status: resolved.status, error: resolved.error };
  }

  if (resolved.type === "legacy") {
    interviewServerLog.info("validate", COMPONENT, "resolve_ok", {
      token: truncateId(token),
      type: "legacy",
      sessionId: truncateId(resolved.session.id),
    });
    return {
      ok: true,
      type: "legacy",
      session: resolved.session,
      candidate: resolved.row.candidate,
      position: resolved.row.position,
      round: resolved.row.round,
    };
  }

  interviewServerLog.info("bundle", COMPONENT, "resolve_ok", {
    token: truncateId(token),
    type: "bundle",
    sessionId: truncateId(resolved.session.id),
    currentRoundIndex: resolved.currentRoundIndex,
    totalRounds: resolved.rounds.length,
    deliveryMode: resolved.bundleRound.deliveryMode,
  });

  return {
    ok: true,
    type: "bundle",
    session: resolved.session,
    candidate: resolved.row.candidate,
    position: resolved.row.position,
    round: resolved.row.round,
    bundleToken: resolved.bundle.bundle.token,
    currentRoundIndex: resolved.currentRoundIndex,
    totalRounds: resolved.rounds.length,
    deliveryMode: resolved.bundleRound.deliveryMode,
    rounds: resolved.rounds,
  };
}
