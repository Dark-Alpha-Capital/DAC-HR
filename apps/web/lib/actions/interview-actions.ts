"use server";

import { db } from "@workspace/db";
import {
  interview,
  interviewFeedback,
  application,
} from "@workspace/db/schema";
import { and, eq } from "@workspace/db";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

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
  data: InterviewRoundData & { interviewId?: string },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let interviewId = data.interviewId;

    if (interviewId) {
      // Update existing interview
      await db
        .update(interview)
        .set({
          overallFeedback: data.overallFeedback,
          proceedToNextRound: data.proceedToNextRound,
          status: "pending",
        })
        .where(eq(interview.id, interviewId));
    } else {
      const [upsertedInterview] = await db
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
        .onConflictDoUpdate({
          target: [interview.applicationId, interview.positionRoundTemplateId],
          set: {
            interviewerId: data.interviewerId,
            scheduledAt: data.scheduledAt,
            status: "pending",
            overallFeedback: data.overallFeedback,
            proceedToNextRound: data.proceedToNextRound,
          },
        })
        .returning();

      interviewId = upsertedInterview?.id;
    }

    // Save responses as interview feedback
    for (const [index, response] of Object.entries(data.responses)) {
      const questionId = data.questionIds[parseInt(index)];
      if (questionId && response) {
        await db
          .insert(interviewFeedback)
          .values({
            interviewId: interviewId as string,
            questionId,
            notes: response,
          })
          .onConflictDoUpdate({
            target: [interviewFeedback.interviewId, interviewFeedback.questionId],
            set: { notes: response },
          });
      }
    }

    // Get candidateId from application
    const [app] = await db
      .select({ candidateId: application.candidateId })
      .from(application)
      .where(eq(application.id, data.applicationId))
      .limit(1);

    updateTag(`application-${data.applicationId}`);
    if (app?.candidateId) {
      updateTag(`candidate-applications-${app.candidateId}`);
      revalidatePath(`/candidates/${app.candidateId}`);
    }

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: data.interviewId
          ? "update_interview_round"
          : "create_interview_round",
        entityType: "interview",
        entityId: interviewId as string,
        details: {
          interview: {
            id: interviewId,
            applicationId: data.applicationId,
            positionRoundTemplateId: data.positionRoundTemplateId,
            interviewerId: data.interviewerId,
            scheduledAt: data.scheduledAt?.toISOString() || null,
            overallFeedback: data.overallFeedback,
            proceedToNextRound: data.proceedToNextRound,
          },
          input: {
            interviewId: data.interviewId,
            applicationId: data.applicationId,
            positionRoundTemplateId: data.positionRoundTemplateId,
            interviewerId: data.interviewerId,
            scheduledAt: data.scheduledAt?.toISOString() || null,
            overallFeedback: data.overallFeedback,
            proceedToNextRound: data.proceedToNextRound,
            questionIds: data.questionIds,
            responsesCount: Object.keys(data.responses).length,
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            isUpdate: !!data.interviewId,
          },
        },
      });
    });

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const [newInterview] = await db
      .insert(interview)
      .values({
        applicationId: data.applicationId,
        positionRoundTemplateId: data.positionRoundTemplateId,
        interviewerId: data.interviewerId,
        status: "pending",
        scheduledAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [interview.applicationId, interview.positionRoundTemplateId],
        set: {
          interviewerId: data.interviewerId,
          status: "pending",
          scheduledAt: new Date(),
        },
      })
      .returning();

    // Get candidateId from application
    const [app] = await db
      .select({ candidateId: application.candidateId })
      .from(application)
      .where(eq(application.id, data.applicationId))
      .limit(1);

    if (newInterview) {
      updateTag(`interview-${newInterview.id}`);
    }
    updateTag(`application-${data.applicationId}`);
    if (app?.candidateId) {
      updateTag(`candidate-applications-${app.candidateId}`);
      revalidatePath(`/candidates/${app.candidateId}`);
    }

    if (newInterview?.id) {
      after(async () => {
        await insertAuditLog({
          userId: session.user.id,
          action: "start_interview_round",
          entityType: "interview",
          entityId: newInterview.id,
          details: {
            interview: {
              id: newInterview.id,
              applicationId: newInterview.applicationId,
              positionRoundTemplateId: newInterview.positionRoundTemplateId,
              interviewerId: newInterview.interviewerId,
              status: newInterview.status,
              scheduledAt: newInterview.scheduledAt?.toISOString() || null,
              createdAt: newInterview.createdAt.toISOString(),
            },
            input: {
              applicationId: data.applicationId,
              positionRoundTemplateId: data.positionRoundTemplateId,
              interviewerId: data.interviewerId,
            },
            createdBy: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
            },
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
        });
      });
    }

    return { success: true, interviewId: newInterview?.id };
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
  positionRoundTemplateId: string,
) {
  try {
    const [interviewData] = await db
      .select()
      .from(interview)
      .where(
        and(
          eq(interview.applicationId, applicationId),
          eq(interview.positionRoundTemplateId, positionRoundTemplateId),
        ),
      )
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
