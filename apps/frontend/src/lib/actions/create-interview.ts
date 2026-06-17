import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { interview, application } from "@workspace/db/schema";
import { getSession } from "~/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export interface CreateInterviewInput {
  applicationId: string;
  positionRoundTemplateId: string;
  interviewerId: string;
  scheduledAt?: Date;
}

export const createInterview = createServerFn({ method: "POST" })
  .validator((data: CreateInterviewInput) => data)
  .handler(async ({ data }) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { applicationId, positionRoundTemplateId, interviewerId, scheduledAt } =
    data;

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
        positionRoundTemplateId,
        interviewerId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "pending",
      })
      .returning();

    if (!newInterview) {
      return { error: "Failed to create interview" };
    }

    // Update application status to "second_round_technical_screening" if it's still in AI screening
    if (app.status === "ai_screening") {
      await db
        .update(application)
        .set({ status: "second_round_technical_screening" })
        .where(eq(application.id, applicationId));
    }
    insertAuditLog({
        userId: session.user.id,
        action: "create_interview",
        entityType: "interview",
        entityId: newInterview.id,
        details: {
          interview: {
            id: newInterview.id,
            applicationId: newInterview.applicationId,
            positionRoundTemplateId: newInterview.positionRoundTemplateId,
            interviewerId: newInterview.interviewerId,
            scheduledAt: newInterview.scheduledAt?.toISOString() || null,
            status: newInterview.status,
            createdAt: newInterview.createdAt.toISOString(),
          },
          input: {
            applicationId,
            positionRoundTemplateId,
            interviewerId,
            scheduledAt: scheduledAt
              ? new Date(scheduledAt).toISOString()
              : null,
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
});