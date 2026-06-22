import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import {
  interview,
  interviewSession,
  interviewResponse,
  interviewEvaluation,
  questionBank,
  application,
  candidate,
  position,
  roundTemplate,
} from "../schema";

export const createAiInterviewWithSession = async (data: {
  applicationId: string;
  positionRoundTemplateId: string;
  roundId: string;
  expiresAt: Date;
}) => {
  const interviewId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const token = crypto.randomUUID();

  const [newInterview] = await db
    .insert(interview)
    .values({
      id: interviewId,
      applicationId: data.applicationId,
      positionRoundTemplateId: data.positionRoundTemplateId,
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
}) => {
  const [row] = await db
    .insert(interviewResponse)
    .values({
      sessionId: data.sessionId,
      questionId: data.questionId,
      answerText: data.answerText ?? null,
      selectedOptionId: data.selectedOptionId ?? null,
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
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
};

export const getEvaluationBySessionId = async (sessionId: string) => {
  const [row] = await db
    .select()
    .from(interviewEvaluation)
    .where(eq(interviewEvaluation.sessionId, sessionId))
    .limit(1);

  return row ?? null;
};
