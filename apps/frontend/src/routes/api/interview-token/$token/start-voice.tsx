import { createFileRoute } from "@tanstack/react-router";
import { createRealtimeEphemeralSession, openAIKeyFingerprint, sha256Hex } from "@workspace/ai-config";
import { getServerOpenAIApiKey } from "~/lib/server/openai-api-key";
import { getQuestionsForInterviewSession } from "@workspace/db/modules/positions";
import {
  updateSessionStatus,
} from "@workspace/db/repositories/interview-session-repository";
import {
  startBundleRound,
} from "@workspace/db/repositories/interview-bundle-repository";
import { PRACTICE_QUESTIONS } from "@workspace/interview-realtime";
import { buildRealtimeInstructions } from "@workspace/interview-realtime/prompts";
import { resolveInterviewToken } from "~/lib/interview-token";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";

const COMPONENT = "start-voice-api";

/**
 * Retry ephemeral-session creation on transient OpenAI failures (429 / 5xx).
 * Applies backoff so a rate-limit burst doesn't immediately fail the round.
 */
async function createEphemeralSessionWithRetry(options: {
  apiKey: string;
  voice?: string;
  instructions: string;
  safetyIdentifier?: string;
}): Promise<ReturnType<typeof createRealtimeEphemeralSession>> {
  const attempts = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await createRealtimeEphemeralSession(options);
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : String(error);
      const isRateLimit = /rate.?limit|429|too many/i.test(message);
      const isTransient = /5\d\d|timeout|econnreset/i.test(message);
      if (!isRateLimit && !isTransient) {
        throw error;
      }
      if (attempt === attempts - 1) {
        break;
      }
      const delay = 500 * 2 ** attempt;
      interviewServerLog.warn("voice", COMPONENT, "ephemeral_retry", {
        attempt: attempt + 1,
        delayMs: delay,
        rateLimit: isRateLimit,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const Route = createFileRoute("/api/interview-token/$token/start-voice")(
  {
    server: {
      handlers: {
        POST: async ({ params, request }) => {
          try {
            const { token } = params;

            if (!token) {
              interviewServerLog.warn("voice", COMPONENT, "token_missing");
              return Response.json(
                { error: "Token is required" },
                { status: 400 },
              );
            }

            const body = (await request.json().catch(() => null)) as
              | { practice?: boolean }
              | null;
            const isPractice = body?.practice === true;

            const openaiApiKey = getServerOpenAIApiKey();

            interviewServerLog.info("voice", COMPONENT, "start_voice_request", {
              token: truncateId(token),
              isPractice,
              openaiKey: openAIKeyFingerprint(openaiApiKey),
            });

            const resolved = await resolveInterviewToken(token);
            if (!resolved.ok) {
              interviewServerLog.warn("voice", COMPONENT, "token_resolve_failed", {
                token: truncateId(token),
                status: resolved.status,
                error: resolved.error,
              });
              return Response.json(
                { error: resolved.error },
                { status: resolved.status },
              );
            }

            const { session, candidate, position, round } = resolved;

            const voiceAllowed =
              resolved.type === "bundle"
                ? resolved.deliveryMode === "voice"
                : session.deliveryMode === "voice" ||
                  session.deliveryMode === "hybrid";

            if (!isPractice && !voiceAllowed) {
              interviewServerLog.warn("voice", COMPONENT, "voice_not_enabled", {
                token: truncateId(token),
                sessionId: truncateId(session.id),
                deliveryMode:
                  resolved.type === "bundle"
                    ? resolved.deliveryMode
                    : session.deliveryMode,
              });
              return Response.json(
                { error: "Voice interviews are not enabled for this session" },
                { status: 400 },
              );
            }

            const candidateName = `${candidate.firstName} ${candidate.lastName}`;
            const questions = isPractice
              ? PRACTICE_QUESTIONS
              : await getQuestionsForInterviewSession(
                  session.roundId,
                  session.id,
                );

            if (!isPractice && questions.length === 0) {
              interviewServerLog.warn("voice", COMPONENT, "no_questions_for_round", {
                token: truncateId(token),
                sessionId: truncateId(session.id),
                roundId: truncateId(session.roundId),
                type: resolved.type,
              });
            }

            if (
              !isPractice &&
              (session.status === "pending" || session.status === "invited")
            ) {
              if (resolved.type === "bundle") {
                const activeRound = resolved.rounds.find(
                  (r) => r.session.id === session.id,
                );
                if (activeRound) {
                  await startBundleRound(activeRound.bundleRound.id);
                }
              } else {
                await updateSessionStatus(session.id, "in_progress", {
                  startedAt: new Date(),
                });
              }
            }

            const practiceInstructions = [
              session.agentConfig?.instructions?.trim(),
              "This is a PRACTICE session with sample questions. Answers are not recorded or evaluated for hiring. Keep the tone supportive and explain this is practice if asked.",
            ]
              .filter(Boolean)
              .join(" ");

            const instructions = buildRealtimeInstructions({
              roundName: isPractice ? "Practice Session" : round.name,
              positionName: position.name,
              candidateName,
              questions: questions.map((question) => ({
                id: question.id,
                questionText: question.questionText,
                questionType: question.questionType,
                category: question.category,
                options: question.options,
              })),
              agentConfig: isPractice
                ? {
                    provider: "openai" as const,
                    ...session.agentConfig,
                    instructions: practiceInstructions,
                  }
                : (session.agentConfig ?? undefined),
            });

            const ephemeral = await createEphemeralSessionWithRetry({
              apiKey: openaiApiKey,
              voice: session.agentConfig?.voice,
              instructions,
              safetyIdentifier: await sha256Hex(
                `dac:interview-session:${session.id}`,
              ),
            });

            const origin = new URL(request.url).origin;
            const wsUrl = `${origin.replace(/^http/, "ws")}/api/interview-realtime/ws?token=${encodeURIComponent(token)}${isPractice ? "&practice=1" : ""}`;

            interviewServerLog.success("voice", COMPONENT, "start_voice_ok", {
              token: truncateId(token),
              sessionId: truncateId(session.id),
              questionCount: questions.length,
              isPractice,
              type: resolved.type,
              roundIndex:
                resolved.type === "bundle" ? resolved.currentRoundIndex : 0,
              clientSecretPrefix: ephemeral.clientSecret.slice(0, 8),
              model: ephemeral.model,
            });

            return Response.json({
              clientSecret: ephemeral.clientSecret,
              sessionId: session.id,
              realtimeSessionId: ephemeral.id,
              model: ephemeral.model,
              wsUrl,
              isPractice,
              agentConfig: session.agentConfig,
              type: resolved.type,
              currentRoundIndex:
                resolved.type === "bundle" ? resolved.currentRoundIndex : 0,
              totalRounds:
                resolved.type === "bundle" ? resolved.totalRounds : 1,
              questions: questions.map((question) => ({
                id: question.id,
                questionText: question.questionText,
                questionType: question.questionType,
                category: question.category,
                timeLimitSeconds: question.timeLimitSeconds,
                options:
                  question.questionType === "mcq" ? question.options : null,
              })),
            });
          } catch (error) {
            const detail =
              error instanceof Error ? error.message : String(error);
            let resolvedKeyFingerprint: string | undefined;
            try {
              resolvedKeyFingerprint = openAIKeyFingerprint(
                getServerOpenAIApiKey(),
              );
            } catch {
              resolvedKeyFingerprint = openAIKeyFingerprint(
                process.env.OPENAI_API_KEY,
              );
            }
            interviewServerLog.error("voice", COMPONENT, "start_voice_failed", {
              error: detail,
              openaiKey: resolvedKeyFingerprint,
            });
            const clientMessage = detail.startsWith("OpenAI Realtime client secret request failed: ")
              ? `[start-voice] ${detail.replace("OpenAI Realtime client secret request failed: ", "")}`
              : "Failed to start voice session";
            return Response.json({ error: clientMessage }, { status: 500 });
          }
        },
      },
    },
  },
);
