import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/get-session";
import { z } from "zod";
import { deliveryModes } from "@workspace/db/enums";
import { eq, and } from "@workspace/db";
import { db } from "@workspace/db/db";
import { application, positionRoundTemplates } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { createAiInterviewWithSession } from "@workspace/db/repositories/interview-session-repository";

const agentConfigSchema = z.object({
  provider: z.literal("openai"),
  voice: z.string().optional(),
  language: z.string().optional(),
  instructions: z.string().optional(),
});

const createSchema = z.object({
  applicationId: z.string().min(1),
  roundId: z.string().min(1),
  expiryHours: z.number().min(1).max(720).default(72),
  deliveryMode: z.enum(deliveryModes).default("hybrid"),
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

          const { applicationId, roundId, expiryHours, deliveryMode, agentConfig } =
            parsed.data;
          const expiresAt = new Date(
            Date.now() + expiryHours * 60 * 60 * 1000,
          );

          // Find the positionId from the application
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

          // Find the positionRoundTemplateId for this position + round
          const [prt] = await db
            .select({ id: positionRoundTemplates.id })
            .from(positionRoundTemplates)
            .where(
              and(
                eq(positionRoundTemplates.positionId, app.positionId),
                eq(positionRoundTemplates.roundTemplateId, roundId),
              ),
            )
            .limit(1);

          if (!prt) {
            return Response.json(
              { error: "Round template not found for this position" },
              { status: 404 },
            );
          }

          const result = await createAiInterviewWithSession({
            applicationId,
            positionRoundTemplateId: prt.id,
            roundId,
            expiresAt,
            deliveryMode,
            agentConfig,
          });

          insertAuditLog({
            userId: authSession.user.id,
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
                id: authSession.user.id,
                email: authSession.user.email,
                name: authSession.user.name,
              },
            },
          }).catch((error) => console.error("Audit log error:", error));

          const interviewLink = `${new URL(request.url).origin}/interview/${result.session.token}`;

          return Response.json({
            session: result.session,
            interviewId: result.interview.id,
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
