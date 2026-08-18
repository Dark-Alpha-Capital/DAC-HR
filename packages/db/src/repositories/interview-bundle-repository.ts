import { and, asc, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import {
  allRoundsCompleted,
  coerceDeliveryMode,
  currentRoundIndex,
  pickActiveRound,
  pickNextRound,
  toRoundProgress,
  type RoundProgress,
} from "../round-progression";
import type {
  AgentConfig,
  InterviewBundleRoundStatus,
  InterviewBundleStatus,
  RoundDeliveryMode,
} from "../enums";
import {
  application,
  candidate,
  interview,
  interviewBundle,
  interviewBundleRound,
  interviewSession,
  position,
  roundTemplate,
} from "../schema";
import {
  getSessionById,
  getSessionByToken,
} from "./interview-session-repository";

export type RoundConfig = {
  roundId: string;
  deliveryMode: RoundDeliveryMode;
};

export const createPositionInterviewBundle = async (data: {
  applicationId: string;
  roundConfigs: RoundConfig[];
  expiresAt: Date;
  agentConfig?: AgentConfig;
}) => {
  if (data.roundConfigs.length === 0) {
    throw new Error("At least one round is required");
  }

  const bundleId = crypto.randomUUID();
  const bundleToken = crypto.randomUUID();

  const createdInterviewIds: string[] = [];
  const createdSessionIds: string[] = [];

  try {
    const [bundle] = await db
      .insert(interviewBundle)
      .values({
        id: bundleId,
        token: bundleToken,
        applicationId: data.applicationId,
        status: "pending",
        expiresAt: data.expiresAt,
      })
      .returning();

    if (!bundle) {
      throw new Error("Failed to create interview bundle");
    }

    const bundleRounds = [];

    for (let i = 0; i < data.roundConfigs.length; i++) {
      const config = data.roundConfigs[i]!;
      const interviewId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      const internalToken = crypto.randomUUID();

      const [newInterview] = await db
        .insert(interview)
        .values({
          id: interviewId,
          applicationId: data.applicationId,
          roundId: config.roundId,
          mode: "ai_session",
          status: "pending",
        })
        .returning();

      if (!newInterview) {
        throw new Error("Failed to create interview");
      }
      createdInterviewIds.push(interviewId);

      const deliveryMode = coerceDeliveryMode(config.deliveryMode);

      const [newSession] = await db
        .insert(interviewSession)
        .values({
          id: sessionId,
          token: internalToken,
          interviewId,
          applicationId: data.applicationId,
          bundleId,
          roundId: config.roundId,
          expiresAt: data.expiresAt,
          status: "pending",
          deliveryMode,
          agentConfig: data.agentConfig,
        })
        .returning();

      if (!newSession) {
        throw new Error("Failed to create interview session");
      }
      createdSessionIds.push(sessionId);

      const [bundleRound] = await db
        .insert(interviewBundleRound)
        .values({
          bundleId,
          roundId: config.roundId,
          roundOrder: i,
          deliveryMode: config.deliveryMode,
          interviewId,
          sessionId,
          status: "pending",
        })
        .returning();

      if (!bundleRound) {
        throw new Error("Failed to create bundle round");
      }

      bundleRounds.push(bundleRound);
    }

    return { bundle, bundleRounds, token: bundleToken };
  } catch (error) {
    for (const sessionId of createdSessionIds) {
      await db
        .delete(interviewSession)
        .where(eq(interviewSession.id, sessionId))
        .catch(() => undefined);
    }
    for (const interviewId of createdInterviewIds) {
      await db
        .delete(interview)
        .where(eq(interview.id, interviewId))
        .catch(() => undefined);
    }
    await db
      .delete(interviewBundle)
      .where(eq(interviewBundle.id, bundleId))
      .catch(() => undefined);
    throw error;
  }
};

export const getBundleById = async (bundleId: string) => {
  const [row] = await db
    .select()
    .from(interviewBundle)
    .where(eq(interviewBundle.id, bundleId))
    .limit(1);

  return row ?? null;
};

export const getBundleByToken = async (token: string) => {
  const [row] = await db
    .select({
      bundle: interviewBundle,
      application: {
        id: application.id,
        status: application.status,
      },
      candidate: {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
      },
      position: {
        id: position.id,
        name: position.name,
      },
    })
    .from(interviewBundle)
    .innerJoin(application, eq(interviewBundle.applicationId, application.id))
    .innerJoin(candidate, eq(application.candidateId, candidate.id))
    .innerJoin(position, eq(application.positionId, position.id))
    .where(eq(interviewBundle.token, token))
    .limit(1);

  return row ?? null;
};

export const getBundleRounds = async (bundleId: string) => {
  const rows = await db
    .select({
      bundleRound: interviewBundleRound,
      round: {
        id: roundTemplate.id,
        name: roundTemplate.name,
        description: roundTemplate.description,
      },
      session: interviewSession,
    })
    .from(interviewBundleRound)
    .innerJoin(
      roundTemplate,
      eq(interviewBundleRound.roundId, roundTemplate.id),
    )
    .innerJoin(
      interviewSession,
      eq(interviewBundleRound.sessionId, interviewSession.id),
    )
    .where(eq(interviewBundleRound.bundleId, bundleId))
    .orderBy(asc(interviewBundleRound.roundOrder));

  return rows;
};

export const getBundlesByApplicationId = async (applicationId: string) => {
  const bundles = await db
    .select()
    .from(interviewBundle)
    .where(eq(interviewBundle.applicationId, applicationId))
    .orderBy(interviewBundle.createdAt);

  const result = [];

  for (const bundle of bundles) {
    const rounds = await getBundleRounds(bundle.id);
    result.push({ bundle, rounds });
  }

  return result;
};

export const getActiveBundleRound = async (bundleId: string) => {
  const rounds = await getBundleRounds(bundleId);

  const active = pickActiveRound(rounds.map(roundProgressOf));
  if (!active) {
    return null;
  }

  return (
    rounds.find((r) => r.bundleRound.roundOrder === active.roundOrder) ?? null
  );
};

const roundProgressOf = (row: { bundleRound: RoundProgress }): RoundProgress =>
  toRoundProgress(row.bundleRound);

export const getCurrentRoundIndex = async (bundleId: string) => {
  const rounds = await getBundleRounds(bundleId);
  return currentRoundIndex(rounds.map(roundProgressOf));
};

export const startBundleRound = async (bundleRoundId: string) => {
  const [row] = await db
    .update(interviewBundleRound)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(interviewBundleRound.id, bundleRoundId))
    .returning();

  if (row) {
    await db
      .update(interviewBundle)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(interviewBundle.id, row.bundleId));

    await db
      .update(interviewSession)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(interviewSession.id, row.sessionId));
  }

  return row;
};

export const advanceBundleRound = async (sessionId: string) => {
  const [bundleRound] = await db
    .select()
    .from(interviewBundleRound)
    .where(eq(interviewBundleRound.sessionId, sessionId))
    .limit(1);

  if (!bundleRound) {
    return null;
  }

  // Idempotent: never advance a round twice. If this session's bundle round
  // is already completed (DO auto-advance + fallback POST race), just return
  // the current state so callers can read the next round without side effects.
  if (bundleRound.status === "completed") {
    const allRounds = await getBundleRounds(bundleRound.bundleId);
    const allCompleted = allRoundsCompleted(allRounds.map(roundProgressOf));
    const nextProgress = pickNextRound(
      allRounds.map(roundProgressOf),
      bundleRound.roundOrder,
    );
    const nextRound = nextProgress
      ? (allRounds.find(
          (r) => r.bundleRound.roundOrder === nextProgress.roundOrder,
        ) ?? null)
      : null;
    return { bundleRound, nextRound, allCompleted };
  }

  await db
    .update(interviewBundleRound)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(interviewBundleRound.id, bundleRound.id));

  await db
    .update(interviewSession)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(interviewSession.id, sessionId));

  await db
    .update(interview)
    .set({ status: "completed" })
    .where(eq(interview.id, bundleRound.interviewId));

  const allRounds = await getBundleRounds(bundleRound.bundleId);
  const allCompleted = allRoundsCompleted(allRounds.map(roundProgressOf));

  if (allCompleted) {
    await db
      .update(interviewBundle)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(interviewBundle.id, bundleRound.bundleId));
  }

  const nextProgress = pickNextRound(
    allRounds.map(roundProgressOf),
    bundleRound.roundOrder,
  );
  const nextRound = nextProgress
    ? (allRounds.find(
        (r) => r.bundleRound.roundOrder === nextProgress.roundOrder,
      ) ?? null)
    : null;

  return { bundleRound, nextRound, allCompleted };
};

export const updateBundleStatus = async (
  bundleId: string,
  status: InterviewBundleStatus,
) => {
  const [row] = await db
    .update(interviewBundle)
    .set({ status, updatedAt: new Date() })
    .where(eq(interviewBundle.id, bundleId))
    .returning();

  return row;
};

export const updateBundleRoundStatus = async (
  bundleRoundId: string,
  status: InterviewBundleRoundStatus,
) => {
  const [row] = await db
    .update(interviewBundleRound)
    .set({ status, updatedAt: new Date() })
    .where(eq(interviewBundleRound.id, bundleRoundId))
    .returning();

  return row;
};

export const deleteBundle = async (bundleId: string) => {
  await db.delete(interviewBundle).where(eq(interviewBundle.id, bundleId));
};

export type TokenValidationResult =
  | {
      ok: true;
      type: "bundle";
      bundle: NonNullable<Awaited<ReturnType<typeof getBundleByToken>>>;
      rounds: Awaited<ReturnType<typeof getBundleRounds>>;
      activeRound: Awaited<ReturnType<typeof getActiveBundleRound>>;
      currentRoundIndex: number;
    }
  | {
      ok: true;
      type: "legacy";
      row: NonNullable<Awaited<ReturnType<typeof getSessionByToken>>>;
    }
  | {
      ok: false;
      status: number;
      error: string;
      session?: typeof interviewSession.$inferSelect;
    };

export const assertInterviewTokenValid = async (
  token: string,
): Promise<TokenValidationResult> => {
  const bundleRow = await getBundleByToken(token);

  if (bundleRow) {
    const { bundle } = bundleRow;

    if (bundle.status === "completed" || bundle.status === "reviewed") {
      return {
        ok: false,
        status: 410,
        error: "This interview has already been completed",
      };
    }

    if (new Date(bundle.expiresAt) < new Date()) {
      return {
        ok: false,
        status: 410,
        error: "This interview link has expired",
      };
    }

    const rounds = await getBundleRounds(bundle.id);
    const activeRound = await getActiveBundleRound(bundle.id);
    const currentRoundIndex = await getCurrentRoundIndex(bundle.id);

    return {
      ok: true,
      type: "bundle",
      bundle: bundleRow,
      rounds,
      activeRound,
      currentRoundIndex,
    };
  }

  const row = await getSessionByToken(token);

  if (!row) {
    return { ok: false, status: 404, error: "Interview not found" };
  }

  const { session } = row;

  if (session.status === "completed" || session.status === "reviewed") {
    return {
      ok: false,
      status: 410,
      error: "This interview has already been completed",
      session,
    };
  }

  if (new Date(session.expiresAt) < new Date()) {
    return {
      ok: false,
      status: 410,
      error: "This interview link has expired",
      session,
    };
  }

  return { ok: true, type: "legacy", row };
};

export const resolveSessionFromToken = async (token: string) => {
  const validation = await assertInterviewTokenValid(token);

  if (!validation.ok) {
    return validation;
  }

  if (validation.type === "legacy") {
    return {
      ok: true as const,
      type: "legacy" as const,
      session: validation.row.session,
      row: validation.row,
    };
  }

  const activeRound = validation.activeRound;
  if (!activeRound) {
    return {
      ok: false as const,
      status: 410,
      error: "All interview rounds have been completed",
    };
  }

  const sessionRow = await getSessionById(activeRound.session.id);
  if (!sessionRow) {
    return {
      ok: false as const,
      status: 404,
      error: "Interview session not found",
    };
  }

  return {
    ok: true as const,
    type: "bundle" as const,
    session: sessionRow.session,
    row: sessionRow,
    bundle: validation.bundle,
    bundleRound: activeRound.bundleRound,
    rounds: validation.rounds,
    currentRoundIndex: validation.currentRoundIndex,
  };
};

export const assertInterviewTokenValidForRecordingUpload = async (
  token: string,
  requestedSessionId?: string,
) => {
  const resolved = await resolveSessionFromToken(token);

  if (!resolved.ok) {
    return resolved;
  }

  let session = resolved.session;

  // The client records against a specific session. By the time the upload
  // request is processed the DO may already have advanced to the next round, so
  // the currently-active session is the WRONG one. If the client names its
  // session and it belongs to this bundle, attach the recording there instead.
  if (requestedSessionId && resolved.type === "bundle") {
    const matching = resolved.rounds.find(
      (r) => r.session.id === requestedSessionId,
    );
    if (matching) {
      session = matching.session;
    }
  }

  if (session.status === "reviewed") {
    return {
      ok: false as const,
      status: 410,
      error: "This interview has already been reviewed",
      session,
    };
  }

  if (new Date(session.expiresAt) < new Date()) {
    return {
      ok: false as const,
      status: 410,
      error: "This interview link has expired",
      session,
    };
  }

  if (session.status === "completed") {
    if (session.sessionAudioUrl) {
      return {
        ok: false as const,
        status: 409,
        error: "Recording already uploaded",
        session,
      };
    }
    return { ok: true as const, row: resolved.row, session };
  }

  return { ok: true as const, row: resolved.row, session };
};

export const validatePositionRounds = async (
  applicationId: string,
  roundConfigs: RoundConfig[],
) => {
  const [app] = await db
    .select({ positionId: application.positionId })
    .from(application)
    .where(eq(application.id, applicationId))
    .limit(1);

  if (!app) {
    return { ok: false as const, error: "Application not found" };
  }

  for (const config of roundConfigs) {
    const [round] = await db
      .select({ id: roundTemplate.id })
      .from(roundTemplate)
      .where(
        and(
          eq(roundTemplate.positionId, app.positionId),
          eq(roundTemplate.id, config.roundId),
        ),
      )
      .limit(1);

    if (!round) {
      return {
        ok: false as const,
        error: `Round ${config.roundId} not found for this position`,
      };
    }
  }

  return { ok: true as const, positionId: app.positionId };
};
