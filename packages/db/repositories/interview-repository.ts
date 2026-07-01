import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db/db";
import {
  interview,
  interviewAiAnalysis,
  interviewFeedback,
  questionBank,
  roundTemplate,
  user,
} from "../schema";
import { getApplicationById, getQuestionsByRoundId } from "../queries";
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
