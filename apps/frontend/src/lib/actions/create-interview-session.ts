import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { application, roundTemplate } from "@workspace/db/schema";
import { eq, and } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { createAiInterviewWithSession } from "@workspace/db/repositories/interview-session-repository";

import type { AgentConfig, DeliveryMode } from "@workspace/db/enums";

export interface CreateInterviewSessionInput {
  applicationId: string;
  roundId: string;
  expiryHours?: number;
  deliveryMode?: DeliveryMode;
  agentConfig?: AgentConfig;
}

export const createInterviewSession = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewSessionInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { applicationId, roundId, expiryHours = 72, deliveryMode, agentConfig } = data;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    try {
      const [app] = await db
        .select({
          positionId: application.positionId,
          status: application.status,
        })
        .from(application)
        .where(eq(application.id, applicationId))
        .limit(1);

      if (!app) {
        return { error: "Application not found" };
      }

      const [round] = await db
        .select({ id: roundTemplate.id })
        .from(roundTemplate)
        .where(
          and(
            eq(roundTemplate.positionId, app.positionId),
            eq(roundTemplate.id, roundId),
          ),
        )
        .limit(1);

      if (!round) {
        return { error: "Round not found for this position" };
      }

      const result = await createAiInterviewWithSession({
        applicationId,
        roundId,
        expiresAt,
        deliveryMode,
        agentConfig,
      });

      if (app.status === "ai_screening") {
        await db
          .update(application)
          .set({ status: "first_round" })
          .where(eq(application.id, applicationId));
      }

      insertAuditLog({
        userId: session.user.id,
        action: "create_interview_session",
        entityType: "interview_session",
        entityId: result.session.id,
        details: {
          interview: {
            id: result.interview.id,
            applicationId,
            mode: "ai_session",
          },
          session: {
            id: result.session.id,
            applicationId,
            roundId,
            expiresAt: expiresAt.toISOString(),
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return {
        success: true,
        data: {
          interviewId: result.interview.id,
          token: result.session.token,
          expiresAt: result.session.expiresAt,
        },
      };
    } catch (error) {
      console.error("Error creating interview session:", error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to create interview session" };
    }
  });
