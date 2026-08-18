import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db/db";
import {
  application,
  interview,
  interviewAiAnalysis,
  interviewFeedback,
  position,
  questionBank,
  roundTemplate,
  screener,
  user,
  type JsonObject,
} from "../schema";
import {
  getQuestionsByRoundId,
  getRoundsByPositionId,
} from "./position-repository";
import { getBundlesByApplicationId } from "./interview-bundle-repository";

export const getInterviewsByApplicationId = async (applicationId: string) => {
  try {
    const results = await db
      .select({
        interview: {
          id: interview.id,
          applicationId: interview.applicationId,
          status: interview.status,
          mode: interview.mode,
          rating: interview.rating,
          scheduledAt: interview.scheduledAt,
          overallFeedback: interview.overallFeedback,
          createdAt: interview.createdAt,
        },
        roundTemplate: {
          id: roundTemplate.id,
          name: roundTemplate.name,
          description: roundTemplate.description,
        },
        interviewer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(interview)
      .innerJoin(roundTemplate, eq(interview.roundId, roundTemplate.id))
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(eq(interview.applicationId, applicationId));

    return results.map((result) => ({
      ...result.interview,
      roundTemplate: result.roundTemplate,
      roundId: result.roundTemplate.id,
      interviewer: result.interviewer,
    }));
  } catch (error) {
    console.error("Error fetching interviews by application id", error);
    return [];
  }
};

export const getInterviewById = async (interviewId: string) => {
  try {
    const [interviewResult] = await db
      .select({
        interview: {
          id: interview.id,
          applicationId: interview.applicationId,
          mode: interview.mode,
          status: interview.status,
          rating: interview.rating,
          scheduledAt: interview.scheduledAt,
          overallFeedback: interview.overallFeedback,
          createdAt: interview.createdAt,
        },
        roundTemplate: {
          id: roundTemplate.id,
          name: roundTemplate.name,
          description: roundTemplate.description,
        },
        interviewer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(interview)
      .innerJoin(roundTemplate, eq(interview.roundId, roundTemplate.id))
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(eq(interview.id, interviewId));

    if (!interviewResult) {
      return null;
    }

    const questions = await getQuestionsByRoundId(
      interviewResult.roundTemplate.id,
    );

    const feedbackResults = await db
      .select({
        id: interviewFeedback.id,
        questionId: interviewFeedback.questionId,
        notes: interviewFeedback.notes,
        rating: interviewFeedback.rating,
        question: {
          id: questionBank.id,
          questionText: questionBank.questionText,
        },
      })
      .from(interviewFeedback)
      .innerJoin(
        questionBank,
        eq(interviewFeedback.questionId, questionBank.id),
      )
      .where(eq(interviewFeedback.interviewId, interviewId));

    const questionsWithFeedback = questions.map((question) => {
      const feedback = feedbackResults.find(
        (f) => f.questionId === question.id,
      );
      return {
        ...question,
        feedback: feedback
          ? {
              id: feedback.id,
              notes: feedback.notes,
              rating: feedback.rating,
            }
          : null,
      };
    });

    return {
      ...interviewResult.interview,
      roundTemplate: interviewResult.roundTemplate,
      roundId: interviewResult.roundTemplate.id,
      interviewer: interviewResult.interviewer,
      questions: questionsWithFeedback,
    };
  } catch (error) {
    console.error("Error fetching interview by id", error);
    return null;
  }
};

export const getApplicationWithInterviews = async (applicationId: string) => {
  try {
    const app = await getApplicationById(applicationId);
    if (!app) {
      return null;
    }

    const [interviews, bundles] = await Promise.all([
      getInterviewsByApplicationId(applicationId),
      getBundlesByApplicationId(applicationId),
    ]);

    return {
      ...app,
      interviews,
      bundles,
    };
  } catch (error) {
    console.error("Error fetching application with interviews", error);
    return null;
  }
};

export const deleteInterviewAiAnalysisForInterview = async (
  interviewId: string,
  analysisId: string,
): Promise<{ deleted: boolean; reason?: "not_found" | "mismatch" }> => {
  try {
    const [analysisRecord] = await db
      .select({
        id: interviewAiAnalysis.id,
        interviewId: interviewAiAnalysis.interviewId,
      })
      .from(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.id, analysisId))
      .limit(1);

    if (!analysisRecord) {
      return { deleted: false, reason: "not_found" };
    }

    if (analysisRecord.interviewId !== interviewId) {
      return { deleted: false, reason: "mismatch" };
    }

    const deletedRows = await db
      .delete(interviewAiAnalysis)
      .where(
        and(
          eq(interviewAiAnalysis.id, analysisId),
          eq(interviewAiAnalysis.interviewId, interviewId),
        ),
      )
      .returning({ id: interviewAiAnalysis.id });

    if (deletedRows.length === 0) {
      return { deleted: false, reason: "not_found" };
    }

    return { deleted: true };
  } catch (error) {
    console.error("Error deleting scoped interview AI analysis", error);
    return { deleted: false };
  }
};

export const deleteInterviewAiAnalysisForBundle = async (
  bundleId: string,
  analysisId: string,
): Promise<{ deleted: boolean; reason?: "not_found" | "mismatch" }> => {
  try {
    const [analysisRecord] = await db
      .select({
        id: interviewAiAnalysis.id,
        bundleId: interviewAiAnalysis.bundleId,
      })
      .from(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.id, analysisId))
      .limit(1);

    if (!analysisRecord) {
      return { deleted: false, reason: "not_found" };
    }

    if (analysisRecord.bundleId !== bundleId) {
      return { deleted: false, reason: "mismatch" };
    }

    const deletedRows = await db
      .delete(interviewAiAnalysis)
      .where(
        and(
          eq(interviewAiAnalysis.id, analysisId),
          eq(interviewAiAnalysis.bundleId, bundleId),
        ),
      )
      .returning({ id: interviewAiAnalysis.id });

    if (deletedRows.length === 0) {
      return { deleted: false, reason: "not_found" };
    }

    return { deleted: true };
  } catch (error) {
    console.error("Error deleting scoped bundle AI analysis", error);
    return { deleted: false };
  }
};

export const getApplicationById = async (applicationId: string) => {
  try {
    const [appResult] = await db
      .select({
        application: {
          id: application.id,
          candidateId: application.candidateId,
          positionId: application.positionId,
          status: application.status,
          personality: application.personality,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        },
        position: {
          id: position.id,
          name: position.name,
          slug: position.slug,
          description: position.description,
        },
      })
      .from(application)
      .innerJoin(position, eq(application.positionId, position.id))
      .where(eq(application.id, applicationId));

    if (!appResult) {
      return null;
    }

    // Get all rounds for this position
    const rounds = await getRoundsByPositionId(
      appResult.application.positionId,
    );

    return {
      ...appResult.application,
      position: appResult.position,
      rounds,
    };
  } catch (error) {
    console.error("Error fetching application by id", error);
    return null;
  }
};

/**
 * Fetches all interviews for an application
 * @param applicationId The ID of the application
 * @returns An array of interviews with round and interviewer details
 */

export const saveInterviewAiAnalysis = async (params: {
  interviewId: string;
  bundleId?: string | null;
  applicationId?: string | null;
  positionId?: string | null;
  screenerId?: string | null;
  analysis: string;
  customPrompt?: string | null;
  model?: string;
  structuredData?: JsonObject;
}) => {
  try {
    const [result] = await db
      .insert(interviewAiAnalysis)
      .values({
        interviewId: params.interviewId,
        bundleId: params.bundleId || null,
        applicationId: params.applicationId || null,
        positionId: params.positionId || null,
        screenerId: params.screenerId || null,
        analysis: params.analysis,
        customPrompt: params.customPrompt || null,
        model: params.model || "gpt-4o-mini",
        structuredData: params.structuredData ?? null,
      })
      .returning();

    return result;
  } catch (error) {
    console.error("Error saving interview AI analysis", error);
    return null;
  }
};

/**
 * Fetches all AI analysis results for an interview
 * @param interviewId The ID of the interview
 * @returns Array of interview AI analysis records, ordered by most recent first
 */

export const getInterviewAiAnalysesByBundleId = async (bundleId: string) => {
  try {
    const results = await db
      .select({
        id: interviewAiAnalysis.id,
        interviewId: interviewAiAnalysis.interviewId,
        bundleId: interviewAiAnalysis.bundleId,
        applicationId: interviewAiAnalysis.applicationId,
        positionId: interviewAiAnalysis.positionId,
        screenerId: interviewAiAnalysis.screenerId,
        analysis: interviewAiAnalysis.analysis,
        structuredData: interviewAiAnalysis.structuredData,
        customPrompt: interviewAiAnalysis.customPrompt,
        model: interviewAiAnalysis.model,
        createdAt: interviewAiAnalysis.createdAt,
        updatedAt: interviewAiAnalysis.updatedAt,
        screenerName: screener.name,
      })
      .from(interviewAiAnalysis)
      .leftJoin(screener, eq(interviewAiAnalysis.screenerId, screener.id))
      .where(eq(interviewAiAnalysis.bundleId, bundleId))
      .orderBy(desc(interviewAiAnalysis.createdAt));

    return results;
  } catch (error) {
    console.error("Error fetching bundle AI analyses", error);
    return [];
  }
};

export const getInterviewAiAnalysesByInterviewId = async (
  interviewId: string,
) => {
  try {
    const results = await db
      .select({
        id: interviewAiAnalysis.id,
        interviewId: interviewAiAnalysis.interviewId,
        bundleId: interviewAiAnalysis.bundleId,
        applicationId: interviewAiAnalysis.applicationId,
        positionId: interviewAiAnalysis.positionId,
        screenerId: interviewAiAnalysis.screenerId,
        analysis: interviewAiAnalysis.analysis,
        structuredData: interviewAiAnalysis.structuredData,
        customPrompt: interviewAiAnalysis.customPrompt,
        model: interviewAiAnalysis.model,
        createdAt: interviewAiAnalysis.createdAt,
        updatedAt: interviewAiAnalysis.updatedAt,
        screenerName: screener.name,
      })
      .from(interviewAiAnalysis)
      .leftJoin(screener, eq(interviewAiAnalysis.screenerId, screener.id))
      .where(
        and(
          eq(interviewAiAnalysis.interviewId, interviewId),
          isNull(interviewAiAnalysis.bundleId),
        ),
      )
      .orderBy(desc(interviewAiAnalysis.createdAt));

    return results;
  } catch (error) {
    console.error("Error fetching interview AI analyses", error);
    return [];
  }
};

/**
 * Fetches the most recent AI analysis result for an interview
 * @param interviewId The ID of the interview
 * @returns The most recent interview AI analysis record or null if not found
 */

export const getLatestInterviewAiAnalysis = async (interviewId: string) => {
  try {
    const [result] = await db
      .select()
      .from(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.interviewId, interviewId))
      .orderBy(desc(interviewAiAnalysis.createdAt))
      .limit(1);

    return result || null;
  } catch (error) {
    console.error("Error fetching latest interview AI analysis", error);
    return null;
  }
};

/**
 * Deletes an interview AI analysis by ID
 * @param analysisId The ID of the analysis to delete
 * @returns True if deleted successfully, false otherwise
 */

export const deleteInterviewAiAnalysis = async (analysisId: string) => {
  try {
    const deletedRows = await db
      .delete(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.id, analysisId))
      .returning({ id: interviewAiAnalysis.id });
    return deletedRows.length > 0;
  } catch (error) {
    console.error("Error deleting interview AI analysis", error);
    return false;
  }
};

/**
 * Deletes an interview AI analysis by analysis ID scoped to interview ID
 * @param interviewId The interview ID from route context
 * @param analysisId The analysis ID to delete
 * @returns Deletion result with reason for non-delete cases
 */
