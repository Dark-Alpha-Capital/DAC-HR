import { createFileRoute } from "@tanstack/react-router";
import { interviewsService } from "#/features/interviews/server/interviews-service";
import { z } from "zod";
import { env } from "cloudflare:workers";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";

const COMPONENT = "complete-api";

function triggerEvaluationWorkflow(sessionId: string) {
  const workflow = env.INTERVIEW_EVALUATION_WORKFLOW;

  if (!workflow) {
    return;
  }

  workflow
    .create({ params: { sessionId } })
    .catch((error) =>
      interviewServerLog.error("api", COMPONENT, "evaluation_workflow_create_failed", {
        sessionId: truncateId(sessionId),
        error: error instanceof Error ? error.message : String(error),
      }),
    );
}

const completeSchema = z.object({
  tabSwitches: z.number().int().min(0).default(0),
  sessionId: z.string().optional(),
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

          const resolved = await interviewsService.resolveToken(token);

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

          const requestedSessionId = parsed.data.sessionId;

          if (session.status === "completed") {
            interviewServerLog.info("api", COMPONENT, "already_completed", {
              sessionId: truncateId(session.id),
            });
            triggerEvaluationWorkflow(session.id);
            return Response.json({
              session,
              hasMoreRounds:
                resolved.type === "bundle" &&
                resolved.currentRoundIndex < resolved.totalRounds - 1,
            });
          }

          // Idempotency guard: a voice round is advanced by the Interview Session
          // DO, so a client retry/fallback complete for that session arrives when
          // the active round has already moved on. Never advance the active round
          // on behalf of an older session — that would skip a round.
          if (requestedSessionId && requestedSessionId !== session.id) {
            interviewServerLog.info(
              "api",
              COMPONENT,
              "complete_session_already_advanced",
              {
                requestedSessionId: truncateId(requestedSessionId),
                activeSessionId: truncateId(session.id),
                type: resolved.type,
              },
            );
            if (resolved.type === "bundle") {
              const hasMoreRounds =
                resolved.currentRoundIndex < resolved.totalRounds - 1;
              const nextRound = {
                roundName: resolved.round.name,
                roundOrder: resolved.currentRoundIndex,
                deliveryMode: resolved.deliveryMode,
                sessionId: session.id,
              };
              return Response.json({
                session,
                hasMoreRounds,
                allCompleted: !hasMoreRounds,
                totalRounds: resolved.totalRounds,
                nextRoundName: nextRound.roundName,
                nextRound,
              });
            }
            return Response.json({
              session,
              hasMoreRounds: false,
              allCompleted: true,
              totalRounds: 1,
              nextRoundName: null,
              nextRound: null,
            });
          }

          if (interviewsService.formDeliveryMode(resolved) === "form") {
            const unansweredIndexes =
              await interviewsService.findUnansweredFormQuestions(
                session.id,
                session.roundId,
              );
            if (unansweredIndexes.length > 0) {
              interviewServerLog.warn("form", COMPONENT, "incomplete_form_rejected", {
                sessionId: truncateId(session.id),
                unansweredCount: unansweredIndexes.length,
              });
              return Response.json(
                {
                  error: "Please answer all questions before submitting",
                  unansweredQuestionIndexes: unansweredIndexes,
                },
                { status: 400 },
              );
            }
          }

          const cheatingSummary = parsed.data.cheatingSummary ?? {
            tabSwitches: parsed.data.tabSwitches,
          };

          await interviewsService.updateSessionVoiceMetadata(session.id, {
            cheatingSummary,
          });

          let advanceResult = null;

          if (resolved.type === "bundle") {
            advanceResult = await interviewsService.advanceBundleRound(session.id);
          } else {
            await interviewsService.updateSessionStatus(session.id, "completed", {
              completedAt: new Date(),
              tabSwitches: parsed.data.tabSwitches,
            });
          }

          if (
            resolved.type === "bundle" &&
            advanceResult?.allCompleted &&
            session.bundleId
          ) {
            const autoResult = await interviewsService.autoRunBundleAiAnalysis(session.bundleId);
            interviewServerLog.info(
              "api",
              COMPONENT,
              "auto_ai_analysis",
              autoResult,
            );
          }

          triggerEvaluationWorkflow(session.id);

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
                  sessionId: nextRound.session.id,
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
