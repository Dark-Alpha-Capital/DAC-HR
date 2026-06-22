import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { env } from "cloudflare:workers";
import {
  assertInterviewTokenValid,
  updateSessionStatus,
  updateSessionVoiceMetadata,
} from "@workspace/db/repositories/interview-session-repository";

const completeSchema = z.object({
  tabSwitches: z.number().int().min(0).default(0),
  cheatingSummary: z
    .object({
      tabSwitches: z.number().optional(),
      focusLostSeconds: z.number().optional(),
      fullscreenExits: z.number().optional(),
      copyAttempts: z.number().optional(),
      pasteAttempts: z.number().optional(),
    })
    .optional(),
});

export const Route = createFileRoute("/api/interview-token/$token/complete")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const validation = await assertInterviewTokenValid(token);

          if (!validation.ok) {
            return Response.json({ error: validation.error }, { status: validation.status });
          }

          const { session } = validation.row;

          const body = await request.json();
          const parsed = completeSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const cheatingSummary = parsed.data.cheatingSummary ?? {
            tabSwitches: parsed.data.tabSwitches,
          };

          await updateSessionVoiceMetadata(session.id, {
            cheatingSummary,
          });

          const updated = await updateSessionStatus(session.id, "completed", {
            completedAt: new Date(),
            tabSwitches: parsed.data.tabSwitches,
          });

          const workflow = (env as Record<string, unknown>)
            .INTERVIEW_EVALUATION_WORKFLOW as
            | { create: (input: { params: { sessionId: string } }) => Promise<unknown> }
            | undefined;

          workflow
            ?.create({ params: { sessionId: session.id } })
            .catch((workflowError: unknown) =>
              console.error("Failed to start interview evaluation workflow:", workflowError),
            );

          return Response.json({ session: updated });
        } catch (error) {
          console.error("Error completing interview:", error);
          return Response.json(
            { error: "Failed to complete interview" },
            { status: 500 },
          );
        }
      },
    },
  },
});
