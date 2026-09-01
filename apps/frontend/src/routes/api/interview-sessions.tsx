import { createFileRoute } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";
import { z } from "zod";
import { roundDeliveryModes } from "#/lib/enums";
import { createInterviewSession } from "#/features/interviews/server/mutations/interviews";

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
  sendInviteEmail: z.boolean().optional().default(false),
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

          const body = await request.json();
          const parsed = createSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const result = await createInterviewSession({
            data: parsed.data,
          });

          if (!result.success) {
            const status =
              result.error === "Application not found" ? 404 : 500;
            return Response.json({ error: result.error }, { status });
          }

          const interviewLink = `${new URL(request.url).origin}/interview/${result.data.token}`;

          return Response.json({
            bundleId: result.data.bundleId,
            token: result.data.token,
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
