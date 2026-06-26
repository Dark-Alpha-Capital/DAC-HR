import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/get-session";
import { z } from "zod";
import { roundDeliveryModes } from "@workspace/db/enums";
import { eq } from "@workspace/db";
import { db } from "@workspace/db/db";
import { application } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createPositionInterviewBundle,
  validatePositionRounds,
} from "@workspace/db/repositories/interview-bundle-repository";
import { getRoundsByPositionId } from "@workspace/db/queries";

const agentConfigSchema = z.object({
  provider: z.literal("openai"),
  voice: z.string().optional(),
  language: z.string().optional(),
  instructions: z.string().optional(),
});

const roundConfigSchema = z.object({
  roundId: z.string().min(1),
  deliveryMode: z.enum(roundDeliveryModes),
});

const createSchema = z.object({
  applicationId: z.string().min(1),
  roundConfigs: z.array(roundConfigSchema).optional(),
  expiryHours: z.number().min(1).max(720).default(72),
  agentConfig: agentConfigSchema.optional(),
});

export const Route = createFileRoute("/api/interview-sessions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          if (authSession.user.role !== "admin") {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const body = await request.json();
          const parsed = createSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { applicationId, expiryHours, agentConfig } = parsed.data;
          const expiresAt = new Date(
            Date.now() + expiryHours * 60 * 60 * 1000,
          );

          const [app] = await db
            .select({ positionId: application.positionId })
            .from(application)
            .where(eq(application.id, applicationId))
            .limit(1);

          if (!app) {
            return Response.json(
              { error: "Application not found" },
              { status: 404 },
            );
          }

          let roundConfigs = parsed.data.roundConfigs;

          if (!roundConfigs || roundConfigs.length === 0) {
            const positionRounds = await getRoundsByPositionId(app.positionId);
            roundConfigs = positionRounds.map((round) => ({
              roundId: round.id,
              deliveryMode: "form" as const,
            }));
          }

          const validation = await validatePositionRounds(
            applicationId,
            roundConfigs,
          );

          if (!validation.ok) {
            return Response.json({ error: validation.error }, { status: 404 });
          }

          const result = await createPositionInterviewBundle({
            applicationId,
            roundConfigs,
            expiresAt,
            agentConfig,
          });

          insertAuditLog({
            userId: authSession.user.id,
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
                id: authSession.user.id,
                email: authSession.user.email,
                name: authSession.user.name,
              },
            },
          }).catch((error) => console.error("Audit log error:", error));

          const interviewLink = `${new URL(request.url).origin}/interview/${result.token}`;

          return Response.json({
            bundle: result.bundle,
            bundleId: result.bundle.id,
            token: result.token,
            interviewLink,
          });
        } catch (error) {
          console.error("Error creating interview session:", error);
          return Response.json(
            { error: "Failed to create interview session" },
            { status: 500 },
          );
        }
      },
    },
  },
});
