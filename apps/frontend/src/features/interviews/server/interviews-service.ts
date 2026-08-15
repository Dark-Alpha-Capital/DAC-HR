import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import {
  interview,
  interviewFeedback,
  application,
  candidate,
  position,
} from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createPositionInterviewBundle,
  deleteBundle,
  validatePositionRounds,
  type RoundConfig,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getInterviewById } from "@workspace/db/repositories/interview-repository";
import { getRoundsByPositionId } from "@workspace/db/modules/positions";
import { getApplicationWithInterviews, getInterviewAiAnalysesByBundleId } from "@workspace/db/repositories/interview-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import {
  getBundleById,
  getBundleRounds,
} from "@workspace/db/repositories/interview-bundle-repository";
import {
  assertInterviewTokenValid,
  assertInterviewTokenValidForRecordingUpload,
  resolveSessionFromToken,
  startBundleRound,
  advanceBundleRound,
} from "@workspace/db/repositories/interview-bundle-repository";
import {
  getQuestionsForInterviewSession,
  getQuestionById,
} from "@workspace/db/modules/positions";
import {
  getSessionById,
  getSessionByInterviewId,
  getResponsesBySessionId,
  getEvaluationBySessionId,
  updateSessionStatus,
  updateSessionVoiceMetadata,
  upsertResponse,
  upsertVoiceResponse,
  syncVoiceResponsesForSession,
  insertCheatingEvents,
  upsertEvaluation,
} from "@workspace/db/repositories/interview-session-repository";
import { getScreenerById, getScreenerByPositionId } from "@workspace/db/repositories/screener-repository";
import {
  getApplicationById,
  saveInterviewAiAnalysis,
  getInterviewAiAnalysesByInterviewId,
  deleteInterviewAiAnalysisForInterview,
  deleteInterviewAiAnalysisForBundle,
} from "@workspace/db/repositories/interview-repository";
import { getAiModel } from "#/lib/ai/models";
import { generateText, Output } from "ai";
import {
  interviewAiAnalysisSchema,
} from "../schemas";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";
import { getOptionLabel } from "#/features/questions/helpers";
import { sendMail } from "@workspace/mail";
import {
  getServerEmailSender,
  getPublicBaseUrl,
} from "#/lib/server/email-sender";
import type {
  AgentConfig,
  InterviewStatus,
} from "#/lib/enums";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type CreateInterviewInput = {
  applicationId: string;
  roundId: string;
  interviewerId: string;
  scheduledAt?: Date;
};

export const createInterview = async (
  input: CreateInterviewInput,
  actor: Actor,
) => {
  const { applicationId, roundId, interviewerId, scheduledAt } = input;

  try {
    // Get the application to verify it exists
    const [app] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!app) {
      return { error: "Application not found" };
    }

    // Create the interview
    const [newInterview] = await db
      .insert(interview)
      .values({
        applicationId,
        roundId,
        interviewerId,
        mode: "manual" as const,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "pending",
      })
      .returning();

    if (!newInterview) {
      return { error: "Failed to create interview" };
    }

    // Advance from AI screening when an interview is scheduled
    if (app.status === "ai_screening") {
      await db
        .update(application)
        .set({ status: "first_round" })
        .where(eq(application.id, applicationId));
    }
    insertAuditLog({
      userId: actor.id,
      action: "create_interview",
      entityType: "interview",
      entityId: newInterview.id,
      details: {
        interview: {
          id: newInterview.id,
          applicationId: newInterview.applicationId,
          roundId: newInterview.roundId,
          interviewerId: newInterview.interviewerId,
          scheduledAt: newInterview.scheduledAt?.toISOString() || null,
          status: newInterview.status,
          createdAt: newInterview.createdAt.toISOString(),
        },
        input: {
          applicationId,
          roundId,
          interviewerId,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          applicationStatus: app.status,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: newInterview };
  } catch (error) {
    console.error("Error creating interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview" };
  }
};

export type UpdateInterviewInput = {
  interviewId: string;
  /** `completed` is set by the bundle flow, never chosen in the editor. */
  status?: Exclude<InterviewStatus, "completed">;
  scheduledAt?: Date | null;
  overallFeedback?: string;
  rating?: number;
};

export const updateInterview = async (
  input: UpdateInterviewInput,
  actor: Actor,
) => {
  const { interviewId, status, scheduledAt, overallFeedback, rating } = input;

  try {
    // Get current interview to check application
    const currentInterview = await getInterviewById(interviewId);
    if (!currentInterview) {
      return { error: "Interview not found" };
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return { error: "Rating must be between 1 and 5" };
    }

    const updateData: Partial<typeof interview.$inferInsert> = {};
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined)
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (overallFeedback !== undefined)
      updateData.overallFeedback = overallFeedback;
    if (rating !== undefined) updateData.rating = rating;

    // Update the interview
    const [updatedInterview] = await db
      .update(interview)
      .set(updateData)
      .where(eq(interview.id, interviewId))
      .returning();

    if (!updatedInterview) {
      return { error: "Interview not found" };
    }

    insertAuditLog({
      userId: actor.id,
      action: "update_interview",
      entityType: "interview",
      entityId: updatedInterview.id,
      details: {
        interview: {
          id: updatedInterview.id,
          applicationId: updatedInterview.applicationId,
          status: updatedInterview.status,
          scheduledAt: updatedInterview.scheduledAt?.toISOString() || null,
          overallFeedback: updatedInterview.overallFeedback,
          rating: updatedInterview.rating,
        },
        input: {
          interviewId,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          overallFeedback,
          rating,
        },
        updatedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          previousStatus: currentInterview.status,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: updatedInterview };
  } catch (error) {
    console.error("Error updating interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update interview" };
  }
};

export const deleteInterview = async (interviewId: string, actor: Actor) => {
  try {
    // Get the interview to verify it exists and get application info
    const [existingInterview] = await db
      .select()
      .from(interview)
      .where(eq(interview.id, interviewId))
      .limit(1);

    if (!existingInterview) {
      return { error: "Interview not found" };
    }

    // Delete interview feedback first (foreign key constraint)
    await db
      .delete(interviewFeedback)
      .where(eq(interviewFeedback.interviewId, interviewId));

    // Delete the interview
    await db.delete(interview).where(eq(interview.id, interviewId));

    insertAuditLog({
      userId: actor.id,
      action: "delete_interview",
      entityType: "interview",
      entityId: interviewId,
      details: {
        deletedInterview: {
          id: existingInterview.id,
          applicationId: existingInterview.applicationId,
          roundId: existingInterview.roundId,
          interviewerId: existingInterview.interviewerId,
          status: existingInterview.status,
          rating: existingInterview.rating,
          scheduledAt: existingInterview.scheduledAt?.toISOString() || null,
          createdAt: existingInterview.createdAt.toISOString(),
        },
        deletedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete interview" };
  }
};

export type CreateInterviewSessionInput = {
  applicationId: string;
  roundConfigs?: RoundConfig[];
  expiryHours?: number;
  agentConfig?: AgentConfig;
};

export const createInterviewSession = async (
  input: CreateInterviewSessionInput,
  actor: Actor,
) => {
  const { applicationId, expiryHours = 72, agentConfig } = input;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  try {
    const [app] = await db
      .select({
        positionId: application.positionId,
        status: application.status,
        candidateEmail: candidate.email,
        candidateName: candidate.firstName,
        candidateLastName: candidate.lastName,
        positionName: position.name,
      })
      .from(application)
      .innerJoin(candidate, eq(candidate.id, application.candidateId))
      .innerJoin(position, eq(position.id, application.positionId))
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!app) {
      return { error: "Application not found" };
    }

    let roundConfigs = input.roundConfigs;

    if (!roundConfigs || roundConfigs.length === 0) {
      const positionRounds = await getRoundsByPositionId(app.positionId);
      roundConfigs = positionRounds.map((round) => ({
        roundId: round.id,
        deliveryMode: "form",
      }));
    }

    const validation = await validatePositionRounds(
      applicationId,
      roundConfigs,
    );

    if (!validation.ok) {
      return { error: validation.error };
    }

    const result = await createPositionInterviewBundle({
      applicationId,
      roundConfigs,
      expiresAt,
      agentConfig,
    });

    if (app.status === "ai_screening") {
      await db
        .update(application)
        .set({ status: "first_round" })
        .where(eq(application.id, applicationId));
    }

    // Non-blocking: send the interview link to the candidate. A missing
    // EMAIL binding or a send failure must not fail link creation.
    if (app.candidateEmail) {
      const origin = getPublicBaseUrl();
      const sender = getServerEmailSender();
      if (sender) {
        sendMail({
          sender,
          to: app.candidateEmail,
          template: "interview-invite",
          data: {
            candidateName:
              `${app.candidateName} ${app.candidateLastName}`.trim(),
            positionName: app.positionName,
            interviewUrl: `${origin}/interview/${result.token}`,
            expiresAt: result.bundle.expiresAt,
          },
        }).catch((error) =>
          console.error("Failed to send interview invite email:", error),
        );
      }
    }

    insertAuditLog({
      userId: actor.id,
      action: "create_interview_bundle",
      entityType: "interview_bundle",
      entityId: result.bundle.id,
      details: {
        bundle: {
          id: result.bundle.id,
          applicationId,
          roundCount: result.bundleRounds.length,
          expiresAt: expiresAt.toISOString(),
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return {
      success: true,
      data: {
        bundleId: result.bundle.id,
        token: result.token,
        expiresAt: result.bundle.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error creating interview session:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview session" };
  }
};

export type CreateInterviewFeedbackInput = {
  interviewId: string;
  questionId: string;
  notes?: string;
  rating?: number;
};

export const createInterviewFeedback = async (
  input: CreateInterviewFeedbackInput,
  actor: Actor,
) => {
  const { interviewId, questionId, notes, rating } = input;

  try {
    const [result] = await db
      .insert(interviewFeedback)
      .values({
        interviewId,
        questionId,
        notes: notes ?? null,
        rating: rating ?? null,
      })
      .onConflictDoUpdate({
        target: [interviewFeedback.interviewId, interviewFeedback.questionId],
        set: {
          notes: notes ?? null,
          rating: rating ?? null,
        },
      })
      .returning();

    insertAuditLog({
      userId: actor.id,
      action: "upsert_interview_feedback",
      entityType: "interview_feedback",
      entityId: result?.id || "",
      details: {
        interviewFeedback: {
          id: result?.id || "",
          interviewId: result?.interviewId || "",
          questionId: result?.questionId || "",
          notes: result?.notes || "",
          rating: result?.rating || "",
        },
        input: {
          interviewId,
          questionId,
          notes: notes ?? null,
          rating: rating ?? null,
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          isUpsert: true,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating interview feedback", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview feedback" };
  }
};

export type BulkCreateInterviewFeedbackInput = {
  interviewId: string;
  feedback: Array<{
    questionId: string;
    notes?: string;
    rating?: number;
  }>;
};

export const bulkCreateInterviewFeedback = async (
  input: BulkCreateInterviewFeedbackInput,
  actor: Actor,
) => {
  const { interviewId, feedback } = input;

  try {
    const results = await db.transaction(async (tx) => {
      const upserted: (typeof interviewFeedback.$inferSelect)[] = [];
      for (const item of feedback) {
        const [result] = await tx
          .insert(interviewFeedback)
          .values({
            interviewId,
            questionId: item.questionId,
            notes: item.notes ?? null,
            rating: item.rating ?? null,
          })
          .onConflictDoUpdate({
            target: [
              interviewFeedback.interviewId,
              interviewFeedback.questionId,
            ],
            set: {
              notes: item.notes ?? null,
              rating: item.rating ?? null,
            },
          })
          .returning();

        if (result) {
          upserted.push(result);
        }
      }
      return upserted;
    });

    insertAuditLog({
      userId: actor.id,
      action: "bulk_upsert_interview_feedback",
      entityType: "interview_feedback",
      entityId: interviewId,
      details: {
        feedback: results.map((r) => ({
          id: r.id,
          interviewId: r.interviewId,
          questionId: r.questionId,
          notes: r.notes,
          rating: r.rating,
        })),
        input: {
          interviewId,
          feedback,
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          count: results.length,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: results };
  } catch (error) {
    console.error("Error bulk creating interview feedback", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create interview feedback" };
  }
};

export const removeInterviewBundle = async (bundleId: string, actor: Actor) => {
  try {
    await deleteBundle(bundleId);

    insertAuditLog({
      userId: actor.id,
      action: "delete_interview_bundle",
      entityType: "interview_bundle",
      entityId: bundleId,
      details: {
        deletedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview bundle:", error);
    return { error: "Failed to delete interview bundle" };
  }
};

// ---- Read-side (queries) ----

type InterviewEvaluation = NonNullable<
  Awaited<ReturnType<typeof getEvaluationBySessionId>>
> & {
  strengths: any;
  risks: any;
  dimensionScores: any;
  perQuestionFeedback: any;
};

export type InterviewDetailData = {
  interview: Awaited<ReturnType<typeof getInterviewById>>;
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  session: Awaited<ReturnType<typeof getSessionByInterviewId>> | null;
  responses: Awaited<ReturnType<typeof getResponsesBySessionId>>;
  evaluation: InterviewEvaluation | null;
};

export type InterviewBundleDetailData = {
  bundle: NonNullable<Awaited<ReturnType<typeof getBundleById>>>;
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  rounds: Awaited<ReturnType<typeof getBundleRounds>>;
  roundDetails: Array<{
    round: Awaited<ReturnType<typeof getBundleRounds>>[number];
    responses: Awaited<ReturnType<typeof getResponsesBySessionId>>;
    evaluation: InterviewEvaluation | null;
  }>;
};

export type InterviewResponse = InterviewDetailData["responses"][number];

export type InterviewQuestion = NonNullable<
  InterviewDetailData["interview"]
>["questions"][number];

const emptyInterviewDetail: InterviewDetailData = {
  interview: null,
  application: null,
  candidate: null,
  session: null,
  responses: [],
  evaluation: null,
};

export const interviewsService = {
  create: createInterview,
  update: updateInterview,
  delete: deleteInterview,
  createSession: createInterviewSession,
  createFeedback: createInterviewFeedback,
  bulkCreateFeedback: bulkCreateInterviewFeedback,
  removeBundle: removeInterviewBundle,

  async getById(id: string): Promise<InterviewDetailData> {
    const interview = await getInterviewById(id);

    if (!interview) {
      return emptyInterviewDetail;
    }

    const application = await getApplicationWithInterviews(
      interview.applicationId,
    );
    const candidate = application
      ? await getCandidateById(application.candidateId)
      : null;

    let session: InterviewDetailData["session"] = null;
    let responses: InterviewDetailData["responses"] = [];
    let evaluation: InterviewDetailData["evaluation"] = null;

    if (interview.mode === "ai_session") {
      session = await getSessionByInterviewId(interview.id).catch(() => null);
      if (session) {
        responses = await getResponsesBySessionId(session.session.id).catch(
          () => [],
        );
        evaluation = await getEvaluationBySessionId(session.session.id).catch(
          () => null,
        );
      }
    }

    return {
      interview,
      application,
      candidate,
      session,
      responses,
      evaluation,
    };
  },

  async getBundleById(bundleId: string): Promise<InterviewBundleDetailData | null> {
    const bundle = await getBundleById(bundleId);

    if (!bundle) {
      return null;
    }

    const application = await getApplicationWithInterviews(bundle.applicationId);
    const candidate = application
      ? await getCandidateById(application.candidateId)
      : null;

    const rounds = await getBundleRounds(bundleId);

    const roundDetails = await Promise.all(
      rounds.map(async (round) => {
        const [responses, evaluation] = await Promise.all([
          getResponsesBySessionId(round.session.id).catch(() => []),
          getEvaluationBySessionId(round.session.id).catch(() => null),
        ]);
        return { round, responses, evaluation };
      }),
    );

    return {
      bundle,
      application,
      candidate,
      rounds,
      roundDetails,
    };
  },

  async getBundleAiAnalyses(bundleId: string) {
    const analyses = await getInterviewAiAnalysesByBundleId(bundleId);
    return {
      analyses: analyses.map((row) => ({
        ...row,
        // SAFETY: structuredData is an arbitrary JSON blob written by the AI
        // workflow; JsonValue is the serializable shape it always has.
        structuredData: row.structuredData as JsonValue | null,
      })),
    };
  },

  // ---- Token resolution (voice/form interview flows) ----

  async resolveToken(token: string) {
    return resolveInterviewToken(token);
  },

  async validateToken(token: string) {
    return assertInterviewTokenValid(token);
  },

  async resolveLegacySession(token: string) {
    return resolveSessionFromToken(token);
  },

  async getSessionById(id: string) {
    return getSessionById(id);
  },

  async getEvaluationBySessionId(sessionId: string) {
    return getEvaluationBySessionId(sessionId);
  },

  async getResponsesBySessionId(sessionId: string) {
    return getResponsesBySessionId(sessionId);
  },

  async upsertEvaluation(data: Parameters<typeof upsertEvaluation>[0]) {
    return upsertEvaluation(data);
  },

  async assertRecordingUploadValid(
    token: string,
    requestedSessionId?: string,
  ) {
    return assertInterviewTokenValidForRecordingUpload(
      token,
      requestedSessionId,
    );
  },

  async getSessionQuestions(sessionRoundId: string) {
    return getQuestionsForInterviewSession(sessionRoundId);
  },

  async getQuestionById(questionId: string) {
    return getQuestionById(questionId);
  },

  async upsertResponse(data: Parameters<typeof upsertResponse>[0]) {
    return upsertResponse(data);
  },

  async updateSessionStatus(
    sessionId: string,
    status: Parameters<typeof updateSessionStatus>[1],
    metadata?: Parameters<typeof updateSessionStatus>[2],
  ) {
    return updateSessionStatus(sessionId, status, metadata);
  },

  async updateSessionVoiceMetadata(
    sessionId: string,
    metadata: Parameters<typeof updateSessionVoiceMetadata>[1],
  ) {
    return updateSessionVoiceMetadata(sessionId, metadata);
  },

  async startBundleRound(bundleRoundId: string) {
    return startBundleRound(bundleRoundId);
  },

  async advanceBundleRound(sessionId: string) {
    return advanceBundleRound(sessionId);
  },

  async upsertVoiceResponse(data: Parameters<typeof upsertVoiceResponse>[0]) {
    return upsertVoiceResponse(data);
  },

  async syncVoiceResponsesForSession(data: Parameters<typeof syncVoiceResponsesForSession>[0]) {
    return syncVoiceResponsesForSession(data);
  },

  async insertCheatingEvents(data: Parameters<typeof insertCheatingEvents>[0]) {
    return insertCheatingEvents(data);
  },

  // ---- AI analysis ----

  async runSingleAiAnalysis(params: {
    scope: { kind: "interview"; id: string } | { kind: "bundle"; id: string };
    screenerId: string;
    customPrompt?: string | null;
  }) {
    return runAiAnalysis(params);
  },

  async runBundleAiAnalysisWithScreener(params: {
    bundleId: string;
    screenerId: string;
    customPrompt?: string | null;
  }) {
    return runAiAnalysis({
      scope: { kind: "bundle", id: params.bundleId },
      screenerId: params.screenerId,
      customPrompt: params.customPrompt,
    });
  },

  async getInterviewAnalyses(interviewId: string) {
    const analyses = await getInterviewAiAnalysesByInterviewId(interviewId);
    return { analyses };
  },

  async deleteInterviewAnalysis(interviewId: string, analysisId: string) {
    return deleteInterviewAiAnalysisForInterview(interviewId, analysisId);
  },

  async deleteBundleAnalysis(bundleId: string, analysisId: string) {
    return deleteInterviewAiAnalysisForBundle(bundleId, analysisId);
  },

  autoRunBundleAiAnalysis,
};

// ---- AI analysis + token + session operations ----

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ScreenerRow = Awaited<ReturnType<typeof getScreenerById>>;
type InterviewRow = NonNullable<Awaited<ReturnType<typeof getInterviewById>>>;

function formatSessionAnswer(response: {
  transcript: string | null;
  answerText: string | null;
  selectedOptionId: string | null;
  question: {
    options: import("@workspace/db/question-types").QuestionOption[] | null;
  };
}): string {
  if (response.transcript?.trim()) {
    return response.transcript.trim();
  }
  if (response.answerText?.trim()) {
    return response.answerText.trim();
  }
  const label = getOptionLabel(
    response.question.options,
    response.selectedOptionId,
  );
  if (label) {
    return label;
  }
  if (response.selectedOptionId) {
    return response.selectedOptionId;
  }
  return "No answer";
}

async function buildAiSessionResponseBlock(interviewId: string): Promise<{
  responseBlock: string;
  sessionMeta: string[];
}> {
  const sessionRow = await getSessionByInterviewId(interviewId);
  if (!sessionRow) {
    return {
      responseBlock: "No session responses recorded.",
      sessionMeta: [],
    };
  }

  const responses = await getResponsesBySessionId(sessionRow.session.id);
  const sessionMeta: string[] = [
    `Delivery mode: ${sessionRow.session.deliveryMode}`,
  ];

  if (sessionRow.session.cheatingSummary) {
    sessionMeta.push(
      `Cheating signals: ${JSON.stringify(sessionRow.session.cheatingSummary)}`,
    );
  }

  if (responses.length === 0) {
    return {
      responseBlock: "No responses recorded for this session.",
      sessionMeta,
    };
  }

  const responseBlock = responses
    .map((response, index) => {
      const answer = formatSessionAnswer(response);
      return `Q${index + 1} (${response.question.questionType}, input: ${response.inputMethod ?? "unknown"}): ${response.question.questionText}\nA: ${answer}`;
    })
    .join("\n\n");

  return { responseBlock, sessionMeta };
}

function buildManualResponseBlock(interview: InterviewRow): string {
  const questions = interview.questions ?? [];
  if (questions.length === 0) {
    return "No questions configured for this interview.";
  }

  return questions
    .map((question, index) => {
      const notes = question.feedback?.notes?.trim();
      const rating = question.feedback?.rating;
      const answer = notes || "No response recorded";
      const ratingSuffix =
        rating != null ? ` (Recruiter rating: ${rating}/5)` : "";
      return `Q${index + 1}: ${question.questionText}\nA: ${answer}${ratingSuffix}`;
    })
    .join("\n\n");
}

async function buildInterviewAnalysisPrompt(params: {
  screener: NonNullable<ScreenerRow>;
  interview: InterviewRow;
  application: {
    position: { name: string; description: string | null };
    candidate?: { firstName: string; lastName: string } | null;
  };
  customPrompt?: string | null;
}): Promise<string> {
  const { screener, interview, application, customPrompt } = params;

  let responseBlock: string;
  const extraContext: string[] = [];

  if (interview.mode === "ai_session") {
    const { responseBlock: block, sessionMeta } =
      await buildAiSessionResponseBlock(interview.id);
    responseBlock = block;
    extraContext.push(...sessionMeta);
  } else {
    responseBlock = buildManualResponseBlock(interview);
    if (interview.overallFeedback?.trim()) {
      extraContext.push(`Overall recruiter feedback: ${interview.overallFeedback}`);
    }
    if (interview.rating != null) {
      extraContext.push(`Overall recruiter rating: ${interview.rating}/5`);
    }
  }

  const candidateLine = application.candidate
    ? `Candidate: ${application.candidate.firstName} ${application.candidate.lastName}`
    : null;

  const positionDescription = application.position.description
    ? ` — ${application.position.description}`
    : "";

  return [
    "## Screener criteria",
    screener.content,
    "",
    "## Context",
    `Position: ${application.position.name}${positionDescription}`,
    `Round: ${interview.roundTemplate.name} | Status: ${interview.status} | Mode: ${interview.mode}`,
    candidateLine,
    ...extraContext,
    "",
    "## Responses",
    responseBlock,
    customPrompt?.trim()
      ? `\n## Additional instructions\n${customPrompt.trim()}`
      : null,
    "",
    "Analyze the candidate against the screener criteria. Output: performance, alignment with position requirements, strengths/concerns, per-question breakdown, and hiring recommendation.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatBundleSessionResponses(
  responses: Awaited<ReturnType<typeof getResponsesBySessionId>>,
): string {
  if (responses.length === 0) {
    return "No responses recorded for this round.";
  }

  return responses
    .map((response, index) => {
      const answer = formatSessionAnswer(response);
      return `Q${index + 1} (${response.question.questionType}, input: ${response.inputMethod ?? "unknown"}): ${response.question.questionText}\nA: ${answer}`;
    })
    .join("\n\n");
}

async function buildBundleInterviewAnalysisPrompt(params: {
  screener: NonNullable<ScreenerRow>;
  bundleId: string;
  application: {
    position: { name: string; description: string | null };
    candidate?: { firstName: string; lastName: string } | null;
  };
  roundCount: number;
  customPrompt?: string | null;
}): Promise<string> {
  const { screener, bundleId, application, roundCount, customPrompt } = params;
  const rounds = await getBundleRounds(bundleId);
  const extraContext: string[] = [
    `Position interview bundle with ${roundCount} configured round(s).`,
  ];
  const roundSections: string[] = [];

  for (const roundRow of rounds) {
    const responses = await getResponsesBySessionId(roundRow.session.id);
    const roundName = roundRow.round.name;
    const deliveryMode = roundRow.bundleRound.deliveryMode;
    const roundStatus = roundRow.bundleRound.status;

    extraContext.push(
      `Round "${roundName}": ${deliveryMode} delivery, status ${roundStatus}, session ${roundRow.session.status}`,
    );

    if (roundRow.session.cheatingSummary) {
      extraContext.push(
        `Round "${roundName}" cheating signals: ${JSON.stringify(roundRow.session.cheatingSummary)}`,
      );
    }

    roundSections.push(
      [
        `### ${roundName} (${deliveryMode})`,
        formatBundleSessionResponses(responses),
      ].join("\n"),
    );
  }

  const candidateLine = application.candidate
    ? `Candidate: ${application.candidate.firstName} ${application.candidate.lastName}`
    : null;

  const positionDescription = application.position.description
    ? ` — ${application.position.description}`
    : "";

  return [
    "## Screener criteria",
    screener.content,
    "",
    "## Context",
    `Position: ${application.position.name}${positionDescription}`,
    candidateLine,
    ...extraContext,
    "",
    "## Responses (all rounds)",
    roundSections.join("\n\n"),
    customPrompt?.trim()
      ? `\n## Additional instructions\n${customPrompt.trim()}`
      : null,
    "",
    "Analyze the candidate holistically across every round above against the screener criteria. Consider voice and form rounds together. Output: performance, alignment with position requirements, strengths/concerns, per-question breakdown grouped by round, and hiring recommendation.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type AiAnalysisResult = {
  analysis?: unknown;
  analysisId?: string | null;
  screenerName?: string;
  error?: string;
};

async function runAiAnalysis({
  scope,
  screenerId,
  customPrompt,
}: {
  scope: { kind: "interview"; id: string } | { kind: "bundle"; id: string };
  screenerId: string;
  customPrompt?: string | null;
}): Promise<AiAnalysisResult> {
  const screener = await getScreenerById(screenerId);
  if (!screener) {
    return { error: "Screener not found" };
  }

  if (scope.kind === "interview") {
    const interview = await getInterviewById(scope.id);
    if (!interview) {
      return { error: "Interview not found" };
    }

    const application = await getApplicationById(interview.applicationId);
    if (!application) {
      return { error: "Application not found" };
    }

    const candidate = await getCandidateById(application.candidateId);
    const prompt = await buildInterviewAnalysisPrompt({
      screener,
      interview,
      application: {
        position: application.position,
        candidate: candidate
          ? { firstName: candidate.firstName, lastName: candidate.lastName }
          : null,
      },
      customPrompt,
    });

    const { output: structuredData } = await generateText({
      model: getAiModel("gpt-4o-mini"),
      output: Output.object({ schema: interviewAiAnalysisSchema }),
      prompt,
    });

    const savedAnalysis = await saveInterviewAiAnalysis({
      interviewId: scope.id,
      applicationId: application.id,
      positionId: application.position.id,
      screenerId: screener.id,
      analysis: structuredData.overallSummary,
      customPrompt: customPrompt || null,
      model: "gpt-4o-mini",
      structuredData,
    });

    return {
      analysis: structuredData,
      analysisId: savedAnalysis?.id || null,
      screenerName: screener.name,
    };
  }

  const bundle = await getBundleById(scope.id);
  if (!bundle) {
    return { error: "Bundle not found" };
  }

  const rounds = await getBundleRounds(scope.id);
  if (rounds.length === 0) {
    return { error: "Bundle has no rounds configured" };
  }

  const application = await getApplicationById(bundle.applicationId);
  if (!application) {
    return { error: "Application not found" };
  }

  const candidate = await getCandidateById(application.candidateId);
  const anchorInterviewId = rounds[0]!.bundleRound.interviewId;

  const prompt = await buildBundleInterviewAnalysisPrompt({
    screener,
    bundleId: scope.id,
    roundCount: rounds.length,
    application: {
      position: application.position,
      candidate: candidate
        ? { firstName: candidate.firstName, lastName: candidate.lastName }
        : null,
    },
    customPrompt,
  });

  const { output: structuredData } = await generateText({
    model: getAiModel("gpt-4o-mini"),
    output: Output.object({ schema: interviewAiAnalysisSchema }),
    prompt,
  });

  const savedAnalysis = await saveInterviewAiAnalysis({
    interviewId: anchorInterviewId,
    bundleId: scope.id,
    applicationId: application.id,
    positionId: application.position.id,
    screenerId: screener.id,
    analysis: structuredData.overallSummary,
    customPrompt: customPrompt || null,
    model: "gpt-4o-mini",
    structuredData,
  });

  return {
    analysis: structuredData,
    analysisId: savedAnalysis?.id || null,
    screenerName: screener.name,
  };
}

export type BundleAnalysisResult = AiAnalysisResult;

async function autoRunBundleAiAnalysis(
  bundleId: string,
): Promise<{ ran: boolean; reason?: string }> {
  try {
    const bundle = await getBundleById(bundleId);
    if (!bundle) {
      return { ran: false, reason: "bundle_not_found" };
    }

    const application = await getApplicationById(bundle.applicationId);
    if (!application) {
      return { ran: false, reason: "application_not_found" };
    }

    const screener = await getScreenerByPositionId(application.position.id);

    if (!screener) {
      return { ran: false, reason: "no_screener_for_position" };
    }

    const existing = await getInterviewAiAnalysesByBundleId(bundleId);
    if (existing.some((item) => item.screenerId === screener.id)) {
      return { ran: false, reason: "already_analysed" };
    }

    const result = await runAiAnalysis({
      scope: { kind: "bundle", id: bundleId },
      screenerId: screener.id,
    });

    if (result.error) {
      console.error("Auto AI analysis error:", result.error);
      return { ran: false, reason: result.error };
    }

    return { ran: true };
  } catch (error) {
    console.error(
      "Auto AI analysis failed:",
      error instanceof Error ? error.message : error,
    );
    return { ran: false, reason: "error" };
  }
}

const COMPONENT = "interview-token";

type ResolvedSessionOk = Extract<
  Awaited<ReturnType<typeof resolveSessionFromToken>>,
  { ok: true }
>;

type ResolvedInterviewSession = ResolvedSessionOk["session"];

type TokenValidationResult = Awaited<ReturnType<typeof assertInterviewTokenValid>>;

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
