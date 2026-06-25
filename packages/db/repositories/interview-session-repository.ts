import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import type {
  AgentConfig,
  CheatingEventType,
  CheatingSummary,
  DeliveryMode,
  InputMethod,
} from "../enums";
import {
  interview,
  interviewSession,
  interviewResponse,
  interviewEvaluation,
  cheatingEvent,
  questionBank,
  application,
  candidate,
  position,
  roundTemplate,
} from "../schema";

export const createAiInterviewWithSession = async (data: {
  applicationId: string;
  roundId: string;
  expiresAt: Date;
  deliveryMode?: DeliveryMode;
  agentConfig?: AgentConfig;
}) => {
  const interviewId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const token = crypto.randomUUID();

  const [newInterview] = await db
    .insert(interview)
    .values({
      id: interviewId,
      applicationId: data.applicationId,
      roundId: data.roundId,
      mode: "ai_session",
      status: "pending",
    })
    .returning();

  if (!newInterview) {
    throw new Error("Failed to create interview");
  }

  try {
    const [newSession] = await db
      .insert(interviewSession)
      .values({
        id: sessionId,
        token,
        interviewId,
        applicationId: data.applicationId,
        roundId: data.roundId,
        expiresAt: data.expiresAt,
        status: "pending",
        deliveryMode: data.deliveryMode ?? "hybrid",
        agentConfig: data.agentConfig,
      })
      .returning();

    if (!newSession) {
      throw new Error("Failed to create interview session");
    }

    return { interview: newInterview, session: newSession };
  } catch (error) {
    await db
      .delete(interview)
      .where(eq(interview.id, interviewId))
      .catch(() => undefined);
    throw error;
  }
};

export const createSession = async (data: {
  applicationId: string;
  roundId: string;
  interviewId: string;
  expiresAt: Date;
}) => {
  const token = crypto.randomUUID();

  const [row] = await db
    .insert(interviewSession)
    .values({
      token,
      interviewId: data.interviewId,
      applicationId: data.applicationId,
      roundId: data.roundId,
      expiresAt: data.expiresAt,
      status: "pending",
    })
    .returning();

  return row;
};

export const updateSessionStatus = async (
  id: string,
  status: typeof interviewSession.$inferInsert.status,
  extra?: {
    startedAt?: Date;
    completedAt?: Date;
    tabSwitches?: number;
  },
) => {
  const [row] = await db
    .update(interviewSession)
    .set({ status, ...extra })
    .where(eq(interviewSession.id, id))
    .returning();

  if (status === "completed" && row?.interviewId) {
    await db
      .update(interview)
      .set({ status: "completed" })
      .where(eq(interview.id, row.interviewId));
  }

  return row;
};

export const getSessionByToken = async (token: string) => {
  const [row] = await db
    .select({
      session: interviewSession,
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
      round: {
        id: roundTemplate.id,
        name: roundTemplate.name,
      },
    })
    .from(interviewSession)
    .innerJoin(
      application,
      eq(interviewSession.applicationId, application.id),
    )
    .innerJoin(candidate, eq(application.candidateId, candidate.id))
    .innerJoin(position, eq(application.positionId, position.id))
    .innerJoin(roundTemplate, eq(interviewSession.roundId, roundTemplate.id))
    .where(eq(interviewSession.token, token))
    .limit(1);

  return row ?? null;
};

export const getSessionById = async (id: string) => {
  const [row] = await db
    .select({
      session: interviewSession,
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
      round: {
        id: roundTemplate.id,
        name: roundTemplate.name,
      },
    })
    .from(interviewSession)
    .innerJoin(
      application,
      eq(interviewSession.applicationId, application.id),
    )
    .innerJoin(candidate, eq(application.candidateId, candidate.id))
    .innerJoin(position, eq(application.positionId, position.id))
    .innerJoin(roundTemplate, eq(interviewSession.roundId, roundTemplate.id))
    .where(eq(interviewSession.id, id))
    .limit(1);

  return row ?? null;
};

export const getSessionByInterviewId = async (interviewId: string) => {
  const [row] = await db
    .select({
      session: interviewSession,
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
      round: {
        id: roundTemplate.id,
        name: roundTemplate.name,
      },
    })
    .from(interviewSession)
    .innerJoin(
      application,
      eq(interviewSession.applicationId, application.id),
    )
    .innerJoin(candidate, eq(application.candidateId, candidate.id))
    .innerJoin(position, eq(application.positionId, position.id))
    .innerJoin(roundTemplate, eq(interviewSession.roundId, roundTemplate.id))
    .where(eq(interviewSession.interviewId, interviewId))
    .limit(1);

  return row ?? null;
};

export const getSessionsByApplicationId = async (applicationId: string) => {
  const rows = await db
    .select({
      session: interviewSession,
      round: {
        id: roundTemplate.id,
        name: roundTemplate.name,
      },
    })
    .from(interviewSession)
    .innerJoin(roundTemplate, eq(interviewSession.roundId, roundTemplate.id))
    .where(eq(interviewSession.applicationId, applicationId))
    .orderBy(interviewSession.createdAt);

  return rows.map((r) => ({
    ...r.session,
    round: r.round,
  }));
};

export const getAllSessions = async () => {
  const rows = await db
    .select({
      session: interviewSession,
      application: {
        id: application.id,
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
      round: {
        id: roundTemplate.id,
        name: roundTemplate.name,
      },
    })
    .from(interviewSession)
    .innerJoin(
      application,
      eq(interviewSession.applicationId, application.id),
    )
    .innerJoin(candidate, eq(application.candidateId, candidate.id))
    .innerJoin(position, eq(application.positionId, position.id))
    .innerJoin(roundTemplate, eq(interviewSession.roundId, roundTemplate.id))
    .orderBy(interviewSession.createdAt);

  return rows.map((r) => ({
    ...r.session,
    candidate: r.candidate,
    position: r.position,
    round: r.round,
  }));
};

export const getResponsesBySessionId = async (sessionId: string) => {
  const rows = await db
    .select({
      response: interviewResponse,
      question: {
        id: questionBank.id,
        questionText: questionBank.questionText,
        questionType: questionBank.questionType,
        category: questionBank.category,
        options: questionBank.options,
        timeLimitSeconds: questionBank.timeLimitSeconds,
      },
    })
    .from(interviewResponse)
    .innerJoin(questionBank, eq(interviewResponse.questionId, questionBank.id))
    .where(eq(interviewResponse.sessionId, sessionId))
    .orderBy(interviewResponse.createdAt);

  return rows.map((r) => ({
    ...r.response,
    question: r.question,
  }));
};

export const getResponseBySessionAndQuestion = async (
  sessionId: string,
  questionId: string,
) => {
  const [row] = await db
    .select()
    .from(interviewResponse)
    .where(
      and(
        eq(interviewResponse.sessionId, sessionId),
        eq(interviewResponse.questionId, questionId),
      ),
    )
    .limit(1);

  return row ?? null;
};

export const createResponse = async (data: {
  sessionId: string;
  questionId: string;
  answerText: string;
}) => {
  const [row] = await db
    .insert(interviewResponse)
    .values({
      sessionId: data.sessionId,
      questionId: data.questionId,
      answerText: data.answerText,
    })
    .returning();

  return row;
};

export const upsertResponse = async (data: {
  sessionId: string;
  questionId: string;
  answerText?: string | null;
  selectedOptionId?: string | null;
  inputMethod?: InputMethod | null;
  audioUrl?: string | null;
  transcript?: string | null;
  transcriptConfidence?: number | null;
  realtimeEventId?: string | null;
}) => {
  const [row] = await db
    .insert(interviewResponse)
    .values({
      sessionId: data.sessionId,
      questionId: data.questionId,
      answerText: data.answerText ?? null,
      selectedOptionId: data.selectedOptionId ?? null,
      inputMethod: data.inputMethod ?? null,
      audioUrl: data.audioUrl ?? null,
      transcript: data.transcript ?? null,
      transcriptConfidence: data.transcriptConfidence ?? null,
      realtimeEventId: data.realtimeEventId ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        interviewResponse.sessionId,
        interviewResponse.questionId,
      ],
      set: {
        answerText: data.answerText ?? null,
        selectedOptionId: data.selectedOptionId ?? null,
        inputMethod: data.inputMethod ?? null,
        audioUrl: data.audioUrl ?? null,
        transcript: data.transcript ?? null,
        transcriptConfidence: data.transcriptConfidence ?? null,
        realtimeEventId: data.realtimeEventId ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
};

export const upsertVoiceResponse = async (data: {
  sessionId: string;
  questionId: string;
  transcript: string;
  selectedOptionId?: string | null;
  transcriptConfidence?: number | null;
  realtimeEventId?: string | null;
}) => {
  return upsertResponse({
    sessionId: data.sessionId,
    questionId: data.questionId,
    answerText: data.transcript,
    transcript: data.transcript,
    selectedOptionId: data.selectedOptionId ?? null,
    transcriptConfidence: data.transcriptConfidence ?? null,
    realtimeEventId: data.realtimeEventId ?? null,
    inputMethod: "voice",
  });
};

export const syncVoiceResponsesForSession = async (data: {
  sessionId: string;
  answers: Array<{
    questionId: string;
    transcript: string;
    selectedOptionId?: string | null;
    realtimeEventId?: string | null;
  }>;
}) => {
  const saved = [];

  for (const answer of data.answers) {
    const transcript = answer.transcript.trim();
    if (!transcript) {
      continue;
    }

    const row = await upsertVoiceResponse({
      sessionId: data.sessionId,
      questionId: answer.questionId,
      transcript,
      selectedOptionId: answer.selectedOptionId ?? null,
      realtimeEventId: answer.realtimeEventId ?? null,
    });
    saved.push(row);
  }

  return saved;
};

export const insertCheatingEvents = async (
  events: Array<{
    sessionId: string;
    eventType: CheatingEventType;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
  }>,
) => {
  if (events.length === 0) {
    return [];
  }

  return db
    .insert(cheatingEvent)
    .values(
      events.map((event) => ({
        sessionId: event.sessionId,
        eventType: event.eventType,
        timestamp: event.timestamp ?? new Date(),
        metadata: event.metadata,
      })),
    )
    .returning();
};

export const updateSessionVoiceMetadata = async (
  sessionId: string,
  data: {
    realtimeSessionId?: string | null;
    cheatingSummary?: CheatingSummary | null;
    sessionAudioUrl?: string | null;
    sessionAudioPath?: string | null;
    interruptedAt?: Date | null;
  },
) => {
  const patch: Partial<typeof interviewSession.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.realtimeSessionId !== undefined) {
    patch.realtimeSessionId = data.realtimeSessionId;
  }
  if (data.cheatingSummary !== undefined) {
    patch.cheatingSummary = data.cheatingSummary;
  }
  if (data.sessionAudioUrl !== undefined) {
    patch.sessionAudioUrl = data.sessionAudioUrl;
  }
  if (data.sessionAudioPath !== undefined) {
    patch.sessionAudioPath = data.sessionAudioPath;
  }
  if (data.interruptedAt !== undefined) {
    patch.interruptedAt = data.interruptedAt;
  }

  const [row] = await db
    .update(interviewSession)
    .set(patch)
    .where(eq(interviewSession.id, sessionId))
    .returning();

  return row;
};

export const upsertEvaluation = async (data: {
  sessionId: string;
  score?: number | null;
  recommendation?: typeof interviewEvaluation.$inferInsert.recommendation;
  summary?: string | null;
  strengths?: unknown;
  risks?: unknown;
  dimensionScores?: unknown;
  perQuestionFeedback?: unknown;
}) => {
  const [row] = await db
    .insert(interviewEvaluation)
    .values({
      sessionId: data.sessionId,
      score: data.score ?? null,
      recommendation: data.recommendation ?? null,
      summary: data.summary ?? null,
      strengths: data.strengths,
      risks: data.risks,
      dimensionScores: data.dimensionScores,
      perQuestionFeedback: data.perQuestionFeedback,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: interviewEvaluation.sessionId,
      set: {
        score: data.score ?? null,
        recommendation: data.recommendation ?? null,
        summary: data.summary ?? null,
        strengths: data.strengths,
        risks: data.risks,
        dimensionScores: data.dimensionScores,
        perQuestionFeedback: data.perQuestionFeedback,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
};

export const assertInterviewTokenValid = async (token: string) => {
  const row = await getSessionByToken(token);

  if (!row) {
    return { ok: false as const, status: 404, error: "Interview not found" };
  }

  const { session } = row;

  if (session.status === "completed" || session.status === "reviewed") {
    return {
      ok: false as const,
      status: 410,
      error: "This interview has already been completed",
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

  return { ok: true as const, row };
};

/** Allows recording upload while session is active, or after completion if no recording exists yet. */
export const assertInterviewTokenValidForRecordingUpload = async (
  token: string,
) => {
  const row = await getSessionByToken(token);

  if (!row) {
    return { ok: false as const, status: 404, error: "Interview not found" };
  }

  const { session } = row;

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
    return { ok: true as const, row };
  }

  return { ok: true as const, row };
};

export const getEvaluationBySessionId = async (sessionId: string) => {
  const [row] = await db
    .select()
    .from(interviewEvaluation)
    .where(eq(interviewEvaluation.sessionId, sessionId))
    .limit(1);

  return row ?? null;
};
