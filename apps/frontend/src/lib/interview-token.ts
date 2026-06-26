import {
  resolveSessionFromToken,
  type TokenValidationResult,
} from "@workspace/db/repositories/interview-bundle-repository";

export type ResolvedInterviewToken =
  | {
      ok: true;
      type: "legacy";
      session: Awaited<ReturnType<typeof resolveSessionFromToken>> extends {
        ok: true;
        session: infer S;
      }
        ? S
        : never;
      candidate: { firstName: string; lastName: string };
      position: { name: string };
      round: { name: string };
    }
  | {
      ok: true;
      type: "bundle";
      session: NonNullable<
        Extract<
          Awaited<ReturnType<typeof resolveSessionFromToken>>,
          { ok: true }
        >["session"]
      >;
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
  const resolved = await resolveSessionFromToken(token);

  if (!resolved.ok) {
    return { ok: false, status: resolved.status, error: resolved.error };
  }

  if (resolved.type === "legacy") {
    return {
      ok: true,
      type: "legacy",
      session: resolved.session,
      candidate: resolved.row.candidate,
      position: resolved.row.position,
      round: resolved.row.round,
    };
  }

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
