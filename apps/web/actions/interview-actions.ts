"use server";

import { db } from "@workspace/db";
import { interview, interviewFeedback } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type InterviewRoundData = {
  applicationId: string;
  positionRoundTemplateId: string;
  interviewerId: string;
  scheduledAt?: Date;
  overallFeedback?: string;
  proceedToNextRound?: boolean | null;
  responses: Record<string, string>;
  questionIds: string[];
};

/**
 * Create or update an interview round
 */
export async function saveInterviewRound(
  data: InterviewRoundData & { interviewId?: string }
) {
  try {
    let interviewId = data.interviewId;

    // If interview doesn't exist, create it
    if (!interviewId) {
      const [newInterview] = await db
        .insert(interview)
        .values({
          applicationId: data.applicationId,
          positionRoundTemplateId: data.positionRoundTemplateId,
          interviewerId: data.interviewerId,
          scheduledAt: data.scheduledAt,
          status: "pending",
          overallFeedback: data.overallFeedback,
          proceedToNextRound: data.proceedToNextRound,
        })
        .returning();

      interviewId = newInterview?.id;
    } else {
      // Update existing interview
      await db
        .update(interview)
        .set({
          overallFeedback: data.overallFeedback,
          proceedToNextRound: data.proceedToNextRound,
          status: "completed",
        })
        .where(eq(interview.id, interviewId));
    }

    // Save responses as interview feedback
    for (const [index, response] of Object.entries(data.responses)) {
      const questionId = data.questionIds[parseInt(index)];
      if (questionId && response) {
        // Check if feedback already exists
        const existingFeedback = await db
          .select()
          .from(interviewFeedback)
          .where(eq(interviewFeedback.interviewId, interviewId))
          .where(eq(interviewFeedback.questionId, questionId))
          .limit(1);

        if (existingFeedback.length > 0) {
          // Update existing feedback
          await db
            .update(interviewFeedback)
            .set({ notes: response })
            .where(eq(interviewFeedback.id, existingFeedback[0].id));
        } else {
          // Insert new feedback
          await db.insert(interviewFeedback).values({
            interviewId,
            questionId,
            notes: response,
          });
        }
      }
    }

    revalidatePath(`/candidates/[slug]`, "page");

    return { success: true, interviewId };
  } catch (error) {
    console.error("Error saving interview round:", error);
    return { success: false, error: "Failed to save interview round" };
  }
}

/**
 * Start an interview round (mark as in-progress)
 */
export async function startInterviewRound(data: {
  applicationId: string;
  positionRoundTemplateId: string;
  interviewerId: string;
}) {
  try {
    const [newInterview] = await db
      .insert(interview)
      .values({
        applicationId: data.applicationId,
        positionRoundTemplateId: data.positionRoundTemplateId,
        interviewerId: data.interviewerId,
        status: "scheduled",
        scheduledAt: new Date(),
      })
      .returning();

    revalidatePath(`/candidates/[slug]`, "page");

    return { success: true, interviewId: newInterview.id };
  } catch (error) {
    console.error("Error starting interview round:", error);
    return { success: false, error: "Failed to start interview round" };
  }
}

/**
 * Get interview details for a specific application and round
 */
export async function getInterviewForRound(
  applicationId: string,
  positionRoundTemplateId: string
) {
  try {
    const [interviewData] = await db
      .select()
      .from(interview)
      .where(eq(interview.applicationId, applicationId))
      .where(eq(interview.positionRoundTemplateId, positionRoundTemplateId))
      .limit(1);

    if (!interviewData) {
      return { success: true, interview: null };
    }

    // Get feedback for this interview
    const feedback = await db
      .select()
      .from(interviewFeedback)
      .where(eq(interviewFeedback.interviewId, interviewData.id));

    return {
      success: true,
      interview: {
        ...interviewData,
        feedback,
      },
    };
  } catch (error) {
    console.error("Error fetching interview:", error);
    return { success: false, error: "Failed to fetch interview" };
  }
}
