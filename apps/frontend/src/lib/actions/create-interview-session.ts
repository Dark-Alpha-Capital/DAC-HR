import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { application } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createPositionInterviewBundle,
  validatePositionRounds,
  type RoundConfig,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getRoundsByPositionId } from "@workspace/db/queries";

import type { AgentConfig, RoundDeliveryMode } from "@workspace/db/enums";

export interface CreateInterviewSessionInput {
  applicationId: string;
  roundConfigs?: RoundConfig[];
  expiryHours?: number;
  agentConfig?: AgentConfig;
}

export const createInterviewSession = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateInterviewSessionInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { applicationId, expiryHours = 72, agentConfig } = data;
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

      let roundConfigs = data.roundConfigs;

      if (!roundConfigs || roundConfigs.length === 0) {
        const positionRounds = await getRoundsByPositionId(app.positionId);
        roundConfigs = positionRounds.map((round) => ({
          roundId: round.id,
          deliveryMode: "form" as RoundDeliveryMode,
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

      insertAuditLog({
        userId: session.user.id,
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
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
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
  });
