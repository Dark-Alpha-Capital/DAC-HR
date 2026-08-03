import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  updateSessionStatus,
  updateSessionVoiceMetadata,
} from "@workspace/db/repositories/interview-session-repository";
import { advanceBundleRound } from "@workspace/db/repositories/interview-bundle-repository";
import { resolveInterviewToken } from "~/lib/interview-token";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";

const COMPONENT = "complete-api";

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
            interviewServerLog.warn("api", COMPONENT, "token_missing");
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          interviewServerLog.info("api", COMPONENT, "complete_request", {
            token: truncateId(token),
          });

          const resolved = await resolveInterviewToken(token);

          if (!resolved.ok) {
            interviewServerLog.warn("api", COMPONENT, "token_resolve_failed", {
              token: truncateId(token),
              error: resolved.error,
            });
            return Response.json(
              { error: resolved.error },
              { status: resolved.status },
            );
          }

          const { session } = resolved;

          if (session.status === "completed") {
            interviewServerLog.info("api", COMPONENT, "already_completed", {
              sessionId: truncateId(session.id),
            });
            return Response.json({
              session,
              hasMoreRounds:
                resolved.type === "bundle" &&
                resolved.currentRoundIndex < resolved.totalRounds - 1,
            });
          }

          const body = await request.json();
          const parsed = completeSchema.safeParse(body);

          if (!parsed.success) {
            interviewServerLog.warn("api", COMPONENT, "validation_failed", {
              sessionId: truncateId(session.id),
            });
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

          let advanceResult = null;

          if (resolved.type === "bundle") {
            advanceResult = await advanceBundleRound(session.id);
          } else {
            await updateSessionStatus(session.id, "completed", {
              completedAt: new Date(),
              tabSwitches: parsed.data.tabSwitches,
            });
          }

          const hasMoreRounds =
            resolved.type === "bundle" &&
            advanceResult != null &&
            !advanceResult.allCompleted &&
            advanceResult.nextRound != null;

          interviewServerLog.success("api", COMPONENT, "complete_ok", {
            token: truncateId(token),
            sessionId: truncateId(session.id),
            type: resolved.type,
            hasMoreRounds,
            allCompleted: advanceResult?.allCompleted ?? true,
          });

          const nextRound = advanceResult?.nextRound ?? null;

          return Response.json({
            session: { ...session, status: "completed" as const },
            hasMoreRounds,
            allCompleted: advanceResult?.allCompleted ?? true,
            totalRounds: resolved.type === "bundle" ? resolved.totalRounds : 1,
            nextRoundName: nextRound?.round.name ?? null,
            nextRound: nextRound
              ? {
                  roundName: nextRound.round.name,
                  roundOrder: nextRound.bundleRound.roundOrder,
                  deliveryMode: nextRound.bundleRound.deliveryMode,
                }
              : null,
          });
        } catch (error) {
          interviewServerLog.error("api", COMPONENT, "complete_failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return Response.json(
            { error: "Failed to complete interview" },
            { status: 500 },
          );
        }
      },
    },
  },
});
