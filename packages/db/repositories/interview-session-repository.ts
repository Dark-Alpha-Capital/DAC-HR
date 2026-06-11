import { and, eq } from "drizzle-orm";
import { db } from "../index";
import {
  interviewSession,
  interviewResponse,
  interviewEvaluation,
  questionBank,
  application,
  candidate,
  position,
  roundTemplate,
} from "../schema";

export const createSession = async (data: {
  applicationId: string;
  roundId: string;
  expiresAt: Date;
}) => {
  const token = crypto.randomUUID();

  const [row] = await db
    .insert(interviewSession)
    .values({
      token,
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
        category: questionBank.questionCategory,
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

export const getEvaluationBySessionId = async (sessionId: string) => {
  const [row] = await db
    .select()
    .from(interviewEvaluation)
    .where(eq(interviewEvaluation.sessionId, sessionId))
    .limit(1);

  return row ?? null;
};
