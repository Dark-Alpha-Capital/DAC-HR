/// <reference types="@cloudflare/workers-types" />

import { getRealtimeSidebandHttpUrl, sha256Hex } from "@workspace/ai-config";
import { z } from "zod";
import type { CheatingEventType, CheatingSummary } from "#/lib/enums";
import { interviewsService } from "#/features/interviews/server/interviews-service";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";
import {
  parseClientMessage,
  serializeDoMessage,
} from "@workspace/interview-realtime/events";
import {
  evaluateCandidateAnswer,
  evaluateIntroUtterance,
  looksLikeNoise,
  PRACTICE_QUESTIONS,
} from "@workspace/interview-realtime";
import {
  matchMcqOption,
  detectQuestionIndexFromTranscript,
  buildCheatingSummary,
  nextPhaseAfterWelcomeDone,
} from "@workspace/interview-realtime/session-logic";
import {
  buildAskCurrentQuestionEvent,
  buildAcknowledgeAnswerEvent,
  buildClosingEvent,
  buildFollowUpAnswerEvent,
  buildIntroFollowUpEvent,
  buildPhaseSessionUpdateEvent,
  buildRealtimeInstructionBase,
  buildRealtimeInstructions,
  buildSessionUpdateEvent,
  buildWelcomeIntroEvent,
} from "@workspace/interview-realtime/prompts";
import {
  nextBackoffDelayMs,
  QUESTION_TIMEOUT_DEFAULT_SECONDS,
  RECONNECT_GRACE_MS,
  SESSION_TIMEOUT_GRACE_MS,
  SESSION_TIMEOUT_MS,
  shouldMarkInterrupted,
  SIDEBAND_CONNECT_MAX_RETRIES,
  SIDEBAND_RECONNECT_MAX_ATTEMPTS,
  WS_CLOSE_NORMAL,
} from "@workspace/interview-realtime/session-rules";
import type {
  ConversationEntry,
  InterviewQuestion,
  InterviewSessionDoStatus,
  InterviewState,
  VoiceInterviewPhase,
} from "@workspace/interview-realtime/types";

/** Params accepted by the InterviewEvaluationWorkflow binding. */
interface EvaluationWorkflowParams {
  sessionId: string;
}

interface WorkflowBinding {
  create: (input: {
    params: EvaluationWorkflowParams;
  }) => Promise<WorkflowInstance>;
}

/** JSON-serializable primitives (log and forwarded payload values). */
type JsonPrimitive = string | number | boolean | null;
/** JSON-serializable value; used for log fields and opaque forwarded payloads. */
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/** Arbitrary structured debug fields forwarded to the structured logger. */
type DoLogFields = Record<string, JsonValue | undefined>;

/** Arbitrary client-reported cheating metadata forwarded to the DB verbatim. */
type CheatingEventMetadata = Record<string, JsonValue>;

/** Token usage reported by the OpenAI Realtime API on `response.done`. */
interface RealtimeUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cached_tokens?: number;
  input_token_details?: {
    cached_tokens?: number;
  };
}

/** OpenAI Realtime conversation item fields this DO reads. */
interface RealtimeConversationItem {
  call_id?: string;
  name?: string;
  role?: string;
  type?: string;
  content?: JsonValue;
}

/** Subset of an OpenAI Realtime server event this DO consumes. */
interface RealtimeEvent {
  type: string;
  event_id?: string;
  response?: {
    id?: string;
    status?: string;
    output?: JsonValue;
    usage?: RealtimeUsage | null;
  };
  item?: RealtimeConversationItem;
  part?: {
    type?: string;
    transcript?: string;
  };
  delta?: string;
  transcript?: string;
  output_index?: number;
  content_index?: number;
  response_id?: string;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
}

/** Normalized token counters used for response metrics. */
interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
}

/** Outbound `response.create` event sent to the realtime API. */
interface ResponseCreateEvent {
  type: string;
  response: {
    instructions?: string | string[];
    max_output_tokens?: number;
    modalities?: JsonValue;
  };
}

/** Outbound DO→client message (the client validates the shape via zod). */
interface DoClientMessage {
  type: string;
  state?: {
    currentQuestionIndex?: number;
    voicePhase?: VoiceInterviewPhase;
    status?: InterviewSessionDoStatus;
    questions?: InterviewQuestion[];
    conversationHistory?: ConversationEntry[];
  };
  index?: number;
  questionId?: string;
  question?: InterviewQuestion;
  message?: string;
  role?: "user" | "assistant";
  text?: string;
  delta?: string;
  transcript?: string;
}

interface InterviewSessionEnv {
  OPENAI_API_KEY: string;
  INTERVIEW_EVALUATION_WORKFLOW?: WorkflowBinding;
}

const realtimeEventSchema = z
  .object({
    type: z.string(),
    event_id: z.string().optional(),
    response: z
      .object({
        id: z.string().optional(),
        status: z.string().optional(),
        output: z.custom<JsonValue>().optional(),
        usage: z
          .object({
            input_tokens: z.number().optional(),
            output_tokens: z.number().optional(),
            total_tokens: z.number().optional(),
            cached_tokens: z.number().optional(),
            input_token_details: z
              .object({ cached_tokens: z.number().optional() })
              .optional(),
          })
          .nullish(),
      })
      .optional(),
    item: z
      .object({
        call_id: z.string().optional(),
        name: z.string().optional(),
        role: z.string().optional(),
        type: z.string().optional(),
        content: z.custom<JsonValue>().optional(),
      })
      .optional(),
    part: z
      .object({
        type: z.string().optional(),
        transcript: z.string().optional(),
      })
      .optional(),
    delta: z.string().optional(),
    transcript: z.string().optional(),
    output_index: z.number().optional(),
    content_index: z.number().optional(),
    response_id: z.string().optional(),
    error: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
        type: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

/** Client-supplied cheating metadata; forwarded verbatim to the DB. */
const cheatingEventMetadataSchema = z.record(z.string(), z.custom<JsonValue>());

/** Parse an OpenAI Realtime server event from the wire; null when invalid. */
function parseRealtimeEvent(raw: string): RealtimeEvent | null {
  try {
    const parsed = realtimeEventSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

declare const WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

const CHEATING_RATE_LIMIT_MS = 1000;
const DO_COMPONENT = "InterviewSessionDO";
const WS_CLOSE_SUPERSEDED = 4001;
const MAX_RECONNECTS_PER_WINDOW = 8;
const RECONNECT_WINDOW_MS = 60 * 1000;
/** Alarm purposes multiplexed onto the single Durable Object alarm slot. */
const ALARM_SESSION_LIMIT = "session_limit";
const ALARM_INTERRUPT_GRACE = "interrupt_grace";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function previewText(text: string, maxLength = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

export class InterviewSessionDO implements DurableObject {
  private durableState: DurableObjectState;
  private env: InterviewSessionEnv;
  private interviewState: InterviewState | null = null;
  private sideband: WebSocket | null = null;
  private sidebandCredentials: { callId: string; clientSecret: string } | null =
    null;
  private sidebandReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sidebandReconnectAttempt = 0;
  private sidebandIntentionalClose = false;
  private pendingResponseMetric: {
    reason: string;
    sentAt: number;
    firstAudioAt?: number;
  } | null = null;
  private pendingWelcomeIntro = false;
  private welcomeIntroFallbackTimer: ReturnType<typeof setTimeout> | null =
    null;
  /** Persisted in InterviewState — survives hibernation (see interviewState). */
  private get welcomeIntroCompleted(): boolean {
    return this.interviewState?.welcomeIntroSent === true;
  }
  private lastCheatingEventAt = new Map<string, number>();
  private focusLostStartedAt: number | null = null;
  private pendingAdvanceAfterAck = false;
  private pendingAdvanceReason: string | null = null;
  private evaluatingAnswer = false;
  private cachedBaseInstructions: string | null = null;
  private sessionTimeLimitSent = false;
  private questionTimer: ReturnType<typeof setTimeout> | null = null;
  /** The currently accepted client WebSocket (new connections supersede it). */
  private clientSocket: WebSocket | null = null;

  constructor(state: DurableObjectState, env: InterviewSessionEnv) {
    this.durableState = state;
    this.env = env;
  }

  private logTranscript(action: string, data: DoLogFields = {}): void {
    interviewServerLog.info("ws", DO_COMPONENT, action, {
      sessionId: truncateId(this.interviewState?.sessionId),
      voicePhase: this.interviewState?.voicePhase,
      ...data,
    });
  }

  private logError(
    action: string,
    cause: unknown,
    data: DoLogFields = {},
  ): void {
    interviewServerLog.error("ws", DO_COMPONENT, action, {
      sessionId: truncateId(this.interviewState?.sessionId),
      voicePhase: this.interviewState?.voicePhase,
      error: cause instanceof Error ? cause.message : String(cause),
      stack: cause instanceof Error ? cause.stack : undefined,
      ...data,
    });
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const token = url.searchParams.get("token");

    if (!sessionId || !token) {
      return new Response("Missing session parameters", { status: 400 });
    }

    // Guard first-time init (DB reads/writes + alarm) against interleaving with
    // concurrent fetches on a cold DO.
    await this.durableState.blockConcurrencyWhile(async () => {
      await this.ensureState(sessionId, token);
    });

    await this.maybeRestoreSideband();

    // A new connection cancels a pending interrupt-grace alarm: the candidate
    // reattached (transient drop / reload), so the session lives on.
    await this.durableState.storage
      .delete("alarmPurpose")
      .catch(() => undefined);
    await this.durableState.storage.setAlarm(Date.now() + SESSION_TIMEOUT_MS);

    // Abuse guard: reject rapid reconnect storms.
    const now = Date.now();
    const reconnects = (this.interviewState!.reconnectAttempts ?? []).filter(
      (t) => now - t < RECONNECT_WINDOW_MS,
    );
    reconnects.push(now);
    this.interviewState!.reconnectAttempts = reconnects;
    if (reconnects.length > MAX_RECONNECTS_PER_WINDOW) {
      this.logTranscript("reconnect_rate_limited", {
        attemptsInWindow: reconnects.length,
        windowMs: RECONNECT_WINDOW_MS,
      });
      return new Response("Too many connection attempts", { status: 429 });
    }

    // Multi-tab: a new connection supersedes the previous one.
    if (this.clientSocket) {
      try {
        this.clientSocket.close(WS_CLOSE_SUPERSEDED, "replaced by another tab");
      } catch {
        // ignore close errors
      }
    }

    this.interviewState!.connectionGeneration =
      (this.interviewState!.connectionGeneration ?? 0) + 1;
    await this.persistState();

    const isPractice = url.searchParams.get("practice") === "1";
    if (isPractice) {
      this.applyPracticeMode();
    }

    this.logTranscript("client_websocket_connected", {
      conversationHistoryLength:
        this.interviewState!.conversationHistory.length,
      currentQuestionIndex: this.interviewState!.currentQuestionIndex,
      connectionGeneration: this.interviewState!.connectionGeneration,
    });

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.clientSocket = server;
    this.durableState.acceptWebSocket(server);

    this.sendToClient(server, {
      type: "CONNECTED",
      state: {
        currentQuestionIndex: this.interviewState!.currentQuestionIndex,
        voicePhase: this.interviewState!.voicePhase ?? "intro",
        status: this.interviewState!.status,
        questions: this.interviewState!.questions,
        conversationHistory: this.interviewState!.conversationHistory,
      },
    });

    const phase = this.interviewState!.voicePhase ?? "intro";
    if (
      phase === "questions" ||
      phase === "closing" ||
      phase === "awaiting_end"
    ) {
      this.sendQuestionToClient(
        server,
        this.interviewState!.currentQuestionIndex,
      );
    }

    // After a reconnect the in-memory question timer is gone (hibernation).
    // Re-arm it so a silent candidate still auto-expires out of the question.
    if (phase === "questions") {
      this.startQuestionTimer();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const parsed = parseClientMessage(message);
      if (!parsed) {
        this.logTranscript("websocket_message_unparsed", {
          messagePreview:
            message instanceof ArrayBuffer
              ? `ArrayBuffer(${message.byteLength})`
              : previewText(message, 80),
        });
        return;
      }

      // After hibernation the instance fields are cold; rehydrate from storage
      // so in-flight messages (e.g. END_INTERVIEW) still apply.
      if (!this.interviewState) {
        await this.restoreStateFromStorage();
      }
      if (!this.interviewState) {
        return;
      }

      await this.maybeRestoreSideband();

      this.logTranscript("websocket_message_received", { type: parsed.type });

      switch (parsed.type) {
        case "PING":
          this.sendToClient(ws, { type: "PONG" });
          break;
        case "CALL_STARTED":
          this.logTranscript("call_started_received", {
            callId: parsed.callId,
            clientSecretPrefix: parsed.clientSecret.slice(0, 8),
          });
          this.sidebandIntentionalClose = false;
          this.sidebandReconnectAttempt = 0;
          this.cancelSidebandReconnect();
          this.resetVoiceSessionForNewCall();
          await this.persistState();
          await this.connectSideband(parsed.callId, parsed.clientSecret);
          break;
        case "REALTIME_EVENT": {
          const stringEvent = z.string().safeParse(parsed.event);
          const raw = stringEvent.success
            ? stringEvent.data
            : (JSON.stringify(parsed.event) ?? "");
          await this.handleRealtimeEvent(raw, "client_dc");
          break;
        }
        case "CHEATING_EVENT": {
          const parsedMetadata = cheatingEventMetadataSchema.safeParse(
            parsed.metadata,
          );
          await this.recordCheatingEvent(
            parsed.eventType,
            parsedMetadata.success ? parsedMetadata.data : undefined,
          );
          break;
        }
        case "FULLSCREEN_STATE":
          this.interviewState.isFullscreen = parsed.isFullscreen;
          if (!parsed.isFullscreen) {
            await this.recordCheatingEvent("FULLSCREEN_EXITED");
          }
          await this.persistState();
          break;
        case "END_INTERVIEW":
          if (this.interviewState.isPracticeMode) {
            await this.endPracticeSession();
          } else {
            await this.completeInterview();
          }
          break;
        default: {
          const _exhaustive: never = parsed;
          void _exhaustive;
        }
      }
    } catch (error) {
      this.logError("websocket_message_failed", error);
      this.broadcast({
        type: "ERROR",
        message: "An internal error occurred. The interview may continue.",
      });
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    void ws;
    if (!this.interviewState) {
      await this.restoreStateFromStorage();
    }

    this.logTranscript("client_websocket_closed", {
      code,
      reason: reason || undefined,
      wasClean,
      status: this.interviewState?.status,
      voicePhase: this.interviewState?.voicePhase,
    });

    if (
      this.interviewState &&
      shouldMarkInterrupted(
        code,
        this.interviewState.status ?? "active",
        Boolean(this.interviewState.isPracticeMode),
      )
    ) {
      // Give the candidate a reconnect window before treating the drop as an
      // interruption. A new connection cancels this via the fetch handler.
      await this.durableState.storage
        .put("alarmPurpose", ALARM_INTERRUPT_GRACE)
        .catch(() => undefined);
      await this.durableState.storage
        .setAlarm(Date.now() + RECONNECT_GRACE_MS)
        .catch(() => undefined);
    }
    this.closeSideband({ intentional: true });
  }

  async webSocketError(ws: WebSocket, cause: unknown) {
    this.logError("client_websocket_error", cause);
    try {
      ws.close(1011, "websocket error");
    } catch {
      // ignore close errors
    }
  }

  /** Rehydrate interviewState from durable storage (used after hibernation). */
  private async restoreStateFromStorage(): Promise<void> {
    if (this.interviewState) {
      return;
    }
    const stored =
      await this.durableState.storage.get<InterviewState>("interviewState");
    if (stored) {
      this.interviewState = {
        ...stored,
        voicePhase: stored.voicePhase ?? "questions",
        welcomeIntroSent: stored.welcomeIntroSent ?? false,
        awaitingAnswerForIndex: stored.awaitingAnswerForIndex ?? null,
        questionAnswers: stored.questionAnswers ?? {},
        questionPartialAnswers: stored.questionPartialAnswers ?? {},
        questionFollowUpCounts: stored.questionFollowUpCounts ?? {},
      };
    }
  }

  /**
   * After a hibernation wake the outbound sideband socket is gone (its event
   * listeners died with the instance). If the persisted descriptor says the
   * voice engine was open, reattach it via the existing reconnect path so the
   * session's voice flow resumes instead of silently stalling.
   */
  private async maybeRestoreSideband() {
    if (this.sideband || !this.interviewState?.sideband) {
      return;
    }
    const { callId, clientSecret, status } = this.interviewState.sideband;
    if (status !== "open" || !callId || !clientSecret) {
      return;
    }
    this.logTranscript("sideband_restored_after_wake", {
      callId: truncateId(callId),
    });
    await this.connectSideband(callId, clientSecret, { isReconnect: true });
  }

  private async ensureState(sessionId: string, token: string) {
    const stored =
      await this.durableState.storage.get<InterviewState>("interviewState");
    if (stored && stored.sessionId === sessionId) {
      this.interviewState = {
        ...stored,
        voicePhase: stored.voicePhase ?? "questions",
        welcomeIntroSent: stored.welcomeIntroSent ?? false,
        awaitingAnswerForIndex: stored.awaitingAnswerForIndex ?? null,
        questionAnswers: stored.questionAnswers ?? {},
        questionPartialAnswers: stored.questionPartialAnswers ?? {},
        questionFollowUpCounts: stored.questionFollowUpCounts ?? {},
      };
      return;
    }

    const row = await interviewsService.getSessionById(sessionId);
    if (!row) {
      throw new Error("Invalid interview session");
    }

    const resolved = await interviewsService.resolveLegacySession(token);
    if (!resolved.ok || resolved.session.id !== sessionId) {
      this.logError("ensure_state_invalid_token", new Error("Token mismatch"), {
        sessionId,
        tokenPrefix: token.slice(0, 8),
        resolvedOk: resolved.ok,
        resolvedSessionId: resolved.ok ? resolved.session.id : undefined,
      });
      throw new Error("Invalid interview session");
    }

    const questions = await interviewsService.getSessionQuestions(
      row.session.roundId,
    );

    this.logTranscript("ensure_state_initialized", {
      sessionId,
      bundleId: row.session.bundleId ?? null,
      deliveryMode: row.session.deliveryMode,
      roundId: truncateId(row.session.roundId),
      roundName: row.round.name,
      questionCount: questions.length,
    });

    this.interviewState = {
      sessionId,
      token,
      deliveryMode: row.session.deliveryMode,
      agentConfig: row.session.agentConfig ?? undefined,
      currentQuestionIndex: 0,
      questions: questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        category: question.category,
        timeLimitSeconds: question.timeLimitSeconds,
        options: question.options,
      })),
      conversationHistory: [],
      cheatingCounters: {},
      isFullscreen: false,
      status: "active",
      voicePhase: "intro",
      welcomeIntroSent: false,
      awaitingAnswerForIndex: null,
      questionAnswers: {},
      questionPartialAnswers: {},
      questionFollowUpCounts: {},
      roundName: row.round.name,
      positionName: row.position.name,
      candidateName: `${row.candidate.firstName} ${row.candidate.lastName}`,
    };

    if (row.session.status === "pending" || row.session.status === "invited") {
      await interviewsService.updateSessionStatus(sessionId, "in_progress", {
        startedAt: new Date(),
      });
    }

    await this.durableState.storage.setAlarm(Date.now() + SESSION_TIMEOUT_MS);
    await this.persistState();
  }

  private applyPracticeMode() {
    if (!this.interviewState) {
      return;
    }

    this.interviewState.isPracticeMode = true;
    this.interviewState.questions = PRACTICE_QUESTIONS;
    this.interviewState.voicePhase = "intro";
    this.interviewState.welcomeIntroSent = false;
    this.interviewState.awaitingAnswerForIndex = null;
    this.interviewState.currentQuestionIndex = 0;
    this.interviewState.conversationHistory = [];
    this.interviewState.questionAnswers = {};
    this.interviewState.questionPartialAnswers = {};
    this.interviewState.questionFollowUpCounts = {};
    this.pendingWelcomeIntro = false;
    this.clearQuestionTimer();
    this.durableState.storage.deleteAlarm().catch(() => undefined);
  }

  private resetVoiceSessionForNewCall() {
    if (!this.interviewState) {
      return;
    }

    this.interviewState.voicePhase = "intro";
    this.interviewState.welcomeIntroSent = false;
    this.interviewState.awaitingAnswerForIndex = null;
    this.interviewState.currentQuestionIndex = 0;
    this.interviewState.conversationHistory = [];
    this.interviewState.questionAnswers = {};
    this.interviewState.questionPartialAnswers = {};
    this.interviewState.questionFollowUpCounts = {};
    if (this.interviewState.isPracticeMode) {
      this.interviewState.questions = PRACTICE_QUESTIONS;
    }
    this.pendingAdvanceAfterAck = false;
    this.pendingAdvanceReason = null;
    this.evaluatingAnswer = false;
    this.pendingWelcomeIntro = false;
    this.sessionTimeLimitSent = false;
    this.clearQuestionTimer();

    this.logTranscript("voice_session_reset", {
      questionCount: this.interviewState.questions.length,
    });
  }

  async alarm() {
    if (!this.interviewState) {
      await this.restoreStateFromStorage();
    }
    if (!this.interviewState || this.interviewState.status === "completed") {
      return;
    }
    if (this.interviewState.isPracticeMode) {
      return;
    }

    const purpose =
      (await this.durableState.storage.get("alarmPurpose")) ??
      ALARM_SESSION_LIMIT;

    if (purpose === ALARM_INTERRUPT_GRACE) {
      await this.durableState.storage
        .delete("alarmPurpose")
        .catch(() => undefined);
      this.logTranscript("interrupt_grace_elapsed", {});
      await this.markInterrupted();
      return;
    }

    this.logTranscript("session_time_limit_alarm", {
      grace: this.sessionTimeLimitSent,
    });

    if (!this.sessionTimeLimitSent) {
      this.sessionTimeLimitSent = true;
      this.broadcast({ type: "SESSION_TIME_LIMIT" });
      await this.durableState.storage.setAlarm(
        Date.now() + SESSION_TIMEOUT_GRACE_MS,
      );
      return;
    }

    await this.completeInterview();
  }

  private startQuestionTimer() {
    this.clearQuestionTimer();
    const question = this.getCurrentQuestion();
    if (!question || !this.interviewState) {
      return;
    }
    const limitSeconds =
      question.timeLimitSeconds ?? QUESTION_TIMEOUT_DEFAULT_SECONDS;
    this.questionTimer = setTimeout(() => {
      void this.handleQuestionTimeout();
    }, limitSeconds * 1000);
  }

  private clearQuestionTimer() {
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }
  }

  private async handleQuestionTimeout() {
    if (!this.interviewState || this.interviewState.status === "completed") {
      return;
    }
    if (this.interviewState.isPracticeMode) {
      return;
    }
    if (this.interviewState.voicePhase !== "questions") {
      return;
    }
    if (this.pendingAdvanceAfterAck) {
      return;
    }

    const question = this.getCurrentQuestion();
    if (!question) {
      return;
    }

    this.logTranscript("question_timed_out", {
      questionIndex: this.interviewState.currentQuestionIndex,
      questionId: question.id,
    });

    const partial =
      this.interviewState.questionPartialAnswers?.[question.id] ?? [];
    const combined = partial.join(" ").trim();
    if (combined) {
      await this.persistQuestionAnswer(question, combined);
    }
    this.clearQuestionAttemptState(question.id);
    this.interviewState.awaitingAnswerForIndex = null;
    this.pendingAdvanceAfterAck = true;
    this.pendingAdvanceReason = "question_timeout";
    await this.persistState();
    this.broadcast({ type: "QUESTION_TIMED_OUT", questionId: question.id });
    this.dispatchResponseCreate(
      buildAcknowledgeAnswerEvent(this.interviewState.currentQuestionIndex),
      "question_timeout",
      {
        questionId: question.id,
        questionIndex: this.interviewState.currentQuestionIndex,
      },
    );
  }

  private getActiveQuestionIndex(): number {
    if (!this.interviewState) {
      return -1;
    }

    if (this.interviewState.awaitingAnswerForIndex != null) {
      return this.interviewState.awaitingAnswerForIndex;
    }

    return this.interviewState.currentQuestionIndex;
  }

  private async persistState() {
    if (!this.interviewState) {
      return;
    }
    await this.durableState.storage.put("interviewState", this.interviewState);
  }

  private cancelSidebandReconnect() {
    if (this.sidebandReconnectTimer) {
      clearTimeout(this.sidebandReconnectTimer);
      this.sidebandReconnectTimer = null;
    }
  }

  private scheduleSidebandReconnect(code?: number, reason?: string) {
    if (this.sidebandIntentionalClose || !this.sidebandCredentials) {
      return;
    }
    if (this.interviewState?.status === "completed") {
      return;
    }
    if (this.sidebandReconnectAttempt >= SIDEBAND_RECONNECT_MAX_ATTEMPTS) {
      this.logTranscript("sideband_reconnect_exhausted", {
        code,
        reason,
        attempt: this.sidebandReconnectAttempt,
      });
      return;
    }

    const delay = nextBackoffDelayMs(this.sidebandReconnectAttempt);
    const attempt = this.sidebandReconnectAttempt + 1;

    this.logTranscript("sideband_reconnect_scheduled", {
      code,
      reason,
      delayMs: delay,
      attempt,
    });

    this.cancelSidebandReconnect();
    this.sidebandReconnectTimer = setTimeout(() => {
      this.sidebandReconnectTimer = null;
      this.sidebandReconnectAttempt = attempt;
      void this.connectSideband(
        this.sidebandCredentials!.callId,
        this.sidebandCredentials!.clientSecret,
        { isReconnect: true },
      );
    }, delay);
  }

  private detachSideband() {
    if (this.sideband) {
      try {
        this.sideband.close();
      } catch {
        // ignore close errors
      }
      this.sideband = null;
    }
  }

  private async tryOpenSideband(
    callId: string,
    clientSecret: string,
  ): Promise<{ ok: true; sideband: WebSocket } | { ok: false; error: string }> {
    let response: Response;
    try {
      const safetyIdentifier = await sha256Hex(
        `dac:interview-session:${this.interviewState?.sessionId ?? "unknown"}`,
      );
      response = await fetch(getRealtimeSidebandHttpUrl(callId), {
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          Upgrade: "websocket",
          "OpenAI-Safety-Identifier": safetyIdentifier,
        },
      });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const sideband = response.webSocket;
    if (!sideband) {
      const errorBody = await response.text().catch(() => "");
      return {
        ok: false,
        error: `HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    sideband.accept();
    return { ok: true, sideband };
  }

  private attachSidebandListeners(sideband: WebSocket, callId: string) {
    sideband.addEventListener("message", (event) => {
      void this.handleRealtimeEvent(String(event.data), "sideband");
    });

    sideband.addEventListener("close", (event) => {
      const code = "code" in event ? event.code : undefined;
      const closeReason = "reason" in event ? event.reason : undefined;
      this.logTranscript("sideband_close", {
        callId,
        code,
        reason: closeReason,
      });
      this.sideband = null;
      if (!this.sidebandIntentionalClose) {
        this.scheduleSidebandReconnect(code, closeReason);
      }
    });

    sideband.addEventListener("error", () => {
      this.logTranscript("sideband_error", { callId });
    });
  }

  private dispatchResponseCreate(
    payload: ResponseCreateEvent,
    reason: string,
    extra: DoLogFields = {},
  ) {
    if (!this.sideband) {
      this.logTranscript("response_create_skipped_no_sideband", { reason });
      return;
    }

    this.pendingResponseMetric = { reason, sentAt: Date.now() };
    this.sideband.send(JSON.stringify(payload));
    this.logTranscript("response_create_sent", {
      reason,
      payloadType: payload.type,
      responseModalities: payload.response.modalities,
      responseInstructions: previewText(
        String(payload.response.instructions ?? ""),
        200,
      ),
      ...extra,
    });
  }

  /**
   * Auto-answer the `wait_for_user` no-op tool so the interviewer can end a turn
   * on silence/background noise without speaking. Completes the function call
   * with empty output and does NOT create a spoken response.
   */
  private maybeAutoReplyWaitForUser(item: RealtimeConversationItem): void {
    if (item.type !== "function_call") {
      return;
    }
    if (item.name !== "wait_for_user") {
      return;
    }
    const callId = item.call_id ?? "";
    if (!callId) {
      return;
    }
    this.logTranscript("wait_for_user_called", {
      callId: truncateId(callId),
    });
    this.sideband?.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: "{}",
        },
      }),
    );
  }

  private recordFirstAudioByte(eventType: string) {
    if (
      !this.pendingResponseMetric ||
      this.pendingResponseMetric.firstAudioAt
    ) {
      return;
    }

    const isAudioDelta =
      eventType === "response.output_audio.delta" ||
      eventType === "response.audio.delta";
    if (!isAudioDelta) {
      return;
    }

    this.pendingResponseMetric.firstAudioAt = Date.now();
    this.logTranscript("response_first_audio", {
      reason: this.pendingResponseMetric.reason,
      msSinceCreate:
        this.pendingResponseMetric.firstAudioAt -
        this.pendingResponseMetric.sentAt,
    });
  }

  private logResponseMetrics(usage?: RealtimeUsage) {
    if (!this.pendingResponseMetric) {
      return;
    }

    const doneAt = Date.now();
    const { reason, sentAt, firstAudioAt } = this.pendingResponseMetric;
    const tokenUsage = usage ? this.extractTokenUsage(usage) : null;
    this.logTranscript("response_metrics", {
      reason,
      msToFirstAudio: firstAudioAt ? firstAudioAt - sentAt : null,
      msToDone: doneAt - sentAt,
      ...(tokenUsage ?? {}),
    });
    this.pendingResponseMetric = null;
  }

  private extractTokenUsage(usage: RealtimeUsage): TokenUsage | null {
    const inputTokens = usage.input_tokens;
    const outputTokens = usage.output_tokens;
    const totalTokens = usage.total_tokens;

    let cachedTokens: number | undefined;
    if (usage.cached_tokens !== undefined) {
      cachedTokens = usage.cached_tokens;
    } else if (usage.input_token_details) {
      cachedTokens = usage.input_token_details.cached_tokens;
    }

    if (
      inputTokens === undefined &&
      outputTokens === undefined &&
      cachedTokens === undefined
    ) {
      return null;
    }

    const result: TokenUsage = {};
    if (inputTokens !== undefined) {
      result.inputTokens = inputTokens;
    }
    if (outputTokens !== undefined) {
      result.outputTokens = outputTokens;
    }
    if (totalTokens !== undefined) {
      result.totalTokens = totalTokens;
    }
    if (cachedTokens !== undefined) {
      result.cachedTokens = cachedTokens;
    }
    return result;
  }

  private extractResponseUsage(
    event: RealtimeEvent,
  ): RealtimeUsage | undefined {
    return event.response?.usage ?? undefined;
  }

  private sendPhaseSessionUpdate(phase: VoiceInterviewPhase) {
    if (
      !this.sideband ||
      !this.interviewState ||
      !this.cachedBaseInstructions
    ) {
      return;
    }

    const sessionUpdate = buildPhaseSessionUpdateEvent({
      baseInstructions: this.cachedBaseInstructions,
      questions: this.interviewState.questions,
      phase,
      agentConfig: this.interviewState.agentConfig,
      voice: this.interviewState.agentConfig?.voice,
    });

    this.sideband.send(JSON.stringify(sessionUpdate));
    this.logTranscript("phase_session_update_sent", {
      phase,
      instructionsLength: String(sessionUpdate.session.instructions).length,
    });
  }

  private async onSidebandConnected(callId: string, isReconnect: boolean) {
    if (!this.sideband || !this.interviewState) {
      return;
    }

    this.logTranscript(isReconnect ? "sideband_reconnected" : "sideband_open", {
      callId,
      via: "fetch_upgrade",
      voicePhase: this.interviewState.voicePhase,
    });

    this.cachedBaseInstructions = buildRealtimeInstructionBase({
      roundName: this.interviewState.roundName,
      positionName: this.interviewState.positionName,
      candidateName: this.interviewState.candidateName,
      questions: this.interviewState.questions,
      agentConfig: this.interviewState.agentConfig,
    });

    const instructions = buildRealtimeInstructions({
      roundName: this.interviewState.roundName,
      positionName: this.interviewState.positionName,
      candidateName: this.interviewState.candidateName,
      questions: this.interviewState.questions,
      agentConfig: this.interviewState.agentConfig,
    });

    const sessionUpdate = buildSessionUpdateEvent(
      instructions,
      this.interviewState.agentConfig?.voice,
    );
    this.logTranscript("session_update_sending", {
      questionCount: this.interviewState.questions.length,
      outputModalities: sessionUpdate.session.output_modalities,
      voice: sessionUpdate.session.audio.output,
      turnDetection: sessionUpdate.session.audio.input?.turn_detection,
      instructionsLength: instructions.length,
    });
    this.sideband.send(JSON.stringify(sessionUpdate));

    if (isReconnect) {
      if (
        !this.welcomeIntroCompleted &&
        (this.interviewState.voicePhase ?? "intro") === "intro"
      ) {
        this.pendingWelcomeIntro = true;
        this.welcomeIntroFallbackTimer = setTimeout(() => {
          void this.sendWelcomeIntro();
        }, 2000);
      }
      await this.persistState();
      return;
    }

    this.interviewState.voicePhase = "intro";
    this.pendingWelcomeIntro = true;

    this.welcomeIntroFallbackTimer = setTimeout(() => {
      void this.sendWelcomeIntro();
    }, 2000);

    await this.persistState();
  }

  private async connectSideband(
    callId: string,
    clientSecret: string,
    options?: { isReconnect?: boolean },
  ) {
    if (!this.interviewState || !clientSecret) {
      this.logTranscript("sideband_connect_skipped", {
        callId,
        hasInterviewState: Boolean(this.interviewState),
        hasClientSecret: Boolean(clientSecret),
      });
      return;
    }

    const isReconnect = options?.isReconnect ?? false;

    try {
      this.logTranscript("sideband_connect_start", {
        callId,
        auth: "ephemeral_client_secret",
        isReconnect,
      });

      this.sidebandCredentials = { callId, clientSecret };
      this.interviewState.sideband = {
        callId,
        clientSecret,
        reconnectAttempt: this.sidebandReconnectAttempt,
        status: "connecting",
      };
      await this.persistState();

      if (!isReconnect) {
        this.interviewState.callId = callId;
        this.interviewState.realtimeSessionId = callId;
        await interviewsService.updateSessionVoiceMetadata(this.interviewState.sessionId, {
          realtimeSessionId: callId,
        });
      }

      this.detachSideband();

      const maxAttempts = isReconnect ? 1 : SIDEBAND_CONNECT_MAX_RETRIES + 1;
      let lastError: string | undefined;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
          const delay = nextBackoffDelayMs(attempt - 1);
          this.logTranscript("sideband_connect_retry", {
            callId,
            attempt,
            delayMs: delay,
          });
          await sleep(delay);
        }

        const result = await this.tryOpenSideband(callId, clientSecret);
        if (result.ok) {
          this.sideband = result.sideband;
          this.attachSidebandListeners(result.sideband, callId);
          this.sidebandReconnectAttempt = 0;
          if (this.interviewState.sideband) {
            this.interviewState.sideband.status = "open";
            this.interviewState.sideband.reconnectAttempt = 0;
          }
          await this.persistState();
          await this.onSidebandConnected(callId, isReconnect);
          return;
        }

        lastError = result.error;
        this.logTranscript("sideband_connect_attempt_failed", {
          callId,
          attempt: attempt + 1,
          error: result.error,
        });
      }

      this.logTranscript("sideband_connect_failed", {
        callId,
        isReconnect,
        lastError,
      });
      this.scheduleSidebandReconnect(undefined, lastError);
    } catch (error) {
      this.logError("sideband_connect_unexpected", error, {
        callId,
        isReconnect: options?.isReconnect ?? false,
      });
      this.scheduleSidebandReconnect(
        undefined,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private closeSideband(options?: { intentional?: boolean }) {
    this.cancelSidebandReconnect();

    if (options?.intentional) {
      this.sidebandIntentionalClose = true;
      this.sidebandCredentials = null;
      this.sidebandReconnectAttempt = 0;
      this.pendingResponseMetric = null;
      delete this.interviewState?.sideband;
      void this.persistState();

      if (this.welcomeIntroFallbackTimer) {
        clearTimeout(this.welcomeIntroFallbackTimer);
        this.welcomeIntroFallbackTimer = null;
      }
      this.pendingWelcomeIntro = false;
    }

    this.detachSideband();
  }

  private async sendWelcomeIntro() {
    if (!this.interviewState || !this.sideband || !this.pendingWelcomeIntro) {
      return;
    }

    this.pendingWelcomeIntro = false;
    if (this.welcomeIntroFallbackTimer) {
      clearTimeout(this.welcomeIntroFallbackTimer);
      this.welcomeIntroFallbackTimer = null;
    }

    this.dispatchWelcomeIntro("welcome_intro");
    await this.persistState();
  }

  private dispatchWelcomeIntro(reason: string) {
    if (!this.interviewState || !this.sideband) {
      return;
    }

    this.dispatchResponseCreate(
      buildWelcomeIntroEvent({
        candidateName: this.interviewState.candidateName,
        positionName: this.interviewState.positionName,
        roundName: this.interviewState.roundName,
      }),
      reason,
    );
    this.broadcast({ type: "INTRO_STARTED" });
  }

  private async resendWelcomeIntro() {
    if (!this.interviewState || !this.sideband || this.welcomeIntroCompleted) {
      return;
    }

    this.logTranscript("welcome_intro_resend");
    this.dispatchWelcomeIntro("welcome_intro_resend");
    await this.persistState();
  }

  private extractResponseStatus(event: RealtimeEvent): string | undefined {
    return event.response?.status;
  }

  private async handleWelcomeInterrupted(responseStatus?: string) {
    if (!this.interviewState || this.welcomeIntroCompleted) {
      return;
    }

    this.logTranscript("welcome_intro_interrupted", {
      responseStatus,
      phase: this.interviewState.voicePhase ?? "intro",
    });

    if (this.interviewState.voicePhase === "intro_ready") {
      this.interviewState.welcomeIntroSent = true;
      this.interviewState.voicePhase = "questions";
      this.sendPhaseSessionUpdate("questions");
      await this.persistState();
      await this.askCurrentQuestion();
      return;
    }

    this.interviewState.welcomeIntroSent = true;
    this.interviewState.voicePhase = "awaiting_ready";
    this.sendPhaseSessionUpdate("awaiting_ready");
    await this.persistState();
    this.dispatchResponseCreate(
      {
        type: "response.create",
        response: {
          max_output_tokens: 120,
          instructions: [
            "You were briefly interrupted during your welcome.",
            "Give a one-sentence recap that you will ask interview questions one at a time.",
            "Ask if they are ready to begin. Do not ask interview questions yet.",
          ].join(" "),
        },
      },
      "welcome_interrupted_recovery",
    );
  }

  private async handleRealtimeEvent(
    raw: string,
    source: "sideband" | "client_dc",
  ) {
    try {
      if (source === "client_dc" && this.sideband) {
        return;
      }

      if (!this.interviewState) {
        return;
      }

      const event = parseRealtimeEvent(raw);
      if (!event) {
        this.logTranscript("realtime_event_parse_failed", {
          source,
          rawPreview: previewText(raw, 80),
        });
        return;
      }

      const type = event.type;

      this.recordFirstAudioByte(type);

      // DEBUG: Log ALL sideband events to trace the response lifecycle
      this.logTranscript("sideband_event_raw", {
        source,
        eventType: type,
        eventKeys: Object.keys(event),
        responseStatus: event.response?.status,
        itemRole: event.item?.role,
        itemType: event.item?.type,
        deltaPreview:
          event.delta !== undefined
            ? previewText(event.delta, 80)
            : undefined,
        transcriptPreview:
          event.transcript !== undefined
            ? previewText(event.transcript, 120)
            : undefined,
      });

      if (type === "session.updated") {
        await this.sendWelcomeIntro();
        return;
      }

      if (type === "conversation.item.input_audio_transcription.delta") {
        const delta = event.delta ?? "";
        if (delta.trim()) {
          this.broadcastTranscriptDelta("user", delta);
        }
        return;
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        const transcript = event.transcript ?? "";
        if (transcript.trim()) {
          await this.saveUserTranscript(transcript, event.event_id);
        }
        return;
      }

      if (
        type === "response.output_audio_transcript.delta" ||
        type === "response.audio_transcript.delta"
      ) {
        const delta = event.delta ?? "";
        if (delta.trim()) {
          this.broadcastTranscriptDelta("assistant", delta);
        }
        return;
      }

      if (
        type === "response.output_audio_transcript.done" ||
        type === "response.audio_transcript.done"
      ) {
        const transcript = event.transcript ?? "";
        if (transcript.trim()) {
          this.appendConversation("assistant", transcript);
          this.broadcastTranscript("assistant", transcript);
          this.syncQuestionFromAssistantTranscript(transcript);
        }
        return;
      }

      if (type === "response.created") {
        this.logTranscript("response_created", {
          responseId: event.response?.id,
          responseStatus: event.response?.status,
          responseOutput: event.response?.output,
        });
        return;
      }

      if (type === "response.output_item.added") {
        this.logTranscript("response_output_item_added", {
          outputIndex: event.output_index,
          itemRole: event.item?.role,
          itemType: event.item?.type,
          itemContent: event.item?.content,
        });
        return;
      }

      if (type === "response.output_item.done") {
        this.logTranscript("response_output_item_done", {
          outputIndex: event.output_index,
          itemRole: event.item?.role,
          itemType: event.item?.type,
        });
        if (event.item) {
          this.maybeAutoReplyWaitForUser(event.item);
        }
        return;
      }

      if (type === "response.content_part.added") {
        this.logTranscript("response_content_part_added", {
          outputIndex: event.output_index,
          contentIndex: event.content_index,
          partType: event.part?.type,
          partTranscript: event.part?.transcript,
        });
        return;
      }

      if (type === "response.content_part.done") {
        this.logTranscript("response_content_part_done", {
          outputIndex: event.output_index,
          contentIndex: event.content_index,
          partType: event.part?.type,
        });
        return;
      }

      if (type === "response.output_audio.delta") {
        this.logTranscript("response_output_audio_delta", {
          responseId: event.response_id,
          outputIndex: event.output_index,
          contentIndex: event.content_index,
          deltaLength: event.delta?.length ?? 0,
        });
        return;
      }

      if (type === "response.output_audio.done") {
        this.logTranscript("response_output_audio_done", {
          responseId: event.response_id,
          outputIndex: event.output_index,
          contentIndex: event.content_index,
        });
        return;
      }

      if (type === "response.cancelled" || type === "response.failed") {
        this.logTranscript("response_cancelled_or_failed", {
          eventType: type,
          voicePhase: this.interviewState?.voicePhase,
          responseStatus: this.extractResponseStatus(event),
          errorCode: event.error?.code,
          errorMessage: event.error?.message,
        });
        if (this.interviewState?.voicePhase === "intro") {
          await this.handleWelcomeInterrupted(type);
        }
        return;
      }

      if (type === "response.done") {
        const usage = this.extractResponseUsage(event);
        const tokenUsage = usage ? this.extractTokenUsage(usage) : null;
        this.logResponseMetrics(usage);
        const responseStatus = this.extractResponseStatus(event);
        this.logTranscript("response_done", {
          voicePhase: this.interviewState.voicePhase,
          awaitingAnswerForIndex: this.interviewState.awaitingAnswerForIndex,
          currentQuestionIndex: this.interviewState.currentQuestionIndex,
          responseStatus,
          ...(tokenUsage ?? {}),
        });

        if (
          this.interviewState.voicePhase === "intro" &&
          responseStatus &&
          responseStatus !== "completed"
        ) {
          await this.handleWelcomeInterrupted(responseStatus);
          return;
        }

        if (
          this.interviewState.voicePhase === "questions" &&
          responseStatus &&
          responseStatus !== "completed"
        ) {
          if (this.pendingAdvanceAfterAck) {
            this.pendingAdvanceAfterAck = false;
            await this.advanceQuestion();
            return;
          }
          // A cancelled/interrupted response mid-question: do NOT re-ask the same
          // question. Stay quiet and wait for the candidate; the per-question
          // timer auto-expires into the next question if they never answer.
          await this.handleResponseDone(responseStatus);
          return;
        }

        await this.handleResponseDone(responseStatus);
        return;
      }

      if (type === "error") {
        this.logTranscript("sideband_error_event", {
          eventType: type,
          errorCode: event.error?.code,
          errorMessage: event.error?.message,
          errorType: event.error?.type,
        });
        return;
      }
    } catch (error) {
      this.logError("handle_realtime_event_failed", error, {
        source,
        rawPreview: previewText(raw, 80),
      });
    }
  }

  private async handleResponseDone(_responseStatus?: string) {
    if (!this.interviewState) {
      return;
    }

    const phase = this.interviewState.voicePhase ?? "questions";

    if (phase === "intro" || phase === "intro_ready") {
      this.interviewState.welcomeIntroSent = true;
      const nextPhase = nextPhaseAfterWelcomeDone(phase);
      this.interviewState.voicePhase = nextPhase;
      this.sendPhaseSessionUpdate(nextPhase);
      await this.persistState();
      if (nextPhase === "questions") {
        await this.askCurrentQuestion();
      }
      return;
    }

    if (phase === "awaiting_ready") {
      return;
    }

    if (phase === "questions") {
      if (this.pendingAdvanceAfterAck) {
        this.pendingAdvanceAfterAck = false;
        await this.advanceQuestion();
        return;
      }

      this.interviewState.awaitingAnswerForIndex =
        this.interviewState.currentQuestionIndex;
      await this.persistState();
      return;
    }

    if (phase === "closing") {
      this.interviewState.voicePhase = "awaiting_end";
      this.sendPhaseSessionUpdate("awaiting_end");
      await this.persistState();
      this.broadcast({ type: "ALL_QUESTIONS_ASKED" });
      // The candidate ends the round manually: the closing statement tells them
      // to click End Interview. No auto-complete — progression is explicit.
      return;
    }

    if (phase === "awaiting_end") {
      return;
    }
  }

  private buildAnswersFromConversation() {
    if (!this.interviewState) {
      return [];
    }

    const answers = this.interviewState.questionAnswers ?? {};

    return this.interviewState.questions
      .map((question) => {
        const transcript = answers[question.id];
        if (!transcript) {
          return null;
        }

        return {
          questionId: question.id,
          transcript,
          selectedOptionId: this.matchMcqOption(question, transcript),
        };
      })
      .filter(
        (answer): answer is NonNullable<typeof answer> => answer !== null,
      );
  }

  private async flushResponsesToDatabase() {
    if (!this.interviewState || this.interviewState.isPracticeMode) {
      return;
    }

    const answers = this.buildAnswersFromConversation();
    if (answers.length === 0) {
      return;
    }

    try {
      await interviewsService.syncVoiceResponsesForSession({
        sessionId: this.interviewState.sessionId,
        answers,
      });
    } catch (error) {
      this.logError("flush_responses_to_database_failed", error);
    }
  }

  private clearQuestionAttemptState(questionId: string) {
    if (!this.interviewState) {
      return;
    }

    if (this.interviewState.questionPartialAnswers) {
      delete this.interviewState.questionPartialAnswers[questionId];
    }
    if (this.interviewState.questionFollowUpCounts) {
      delete this.interviewState.questionFollowUpCounts[questionId];
    }
  }

  private async persistQuestionAnswer(
    question: InterviewQuestion,
    combinedAnswer: string,
    realtimeEventId?: string,
  ) {
    if (!this.interviewState) {
      return;
    }

    if (!this.interviewState.questionAnswers) {
      this.interviewState.questionAnswers = {};
    }
    this.interviewState.questionAnswers[question.id] = combinedAnswer;

    if (this.interviewState.isPracticeMode) {
      this.broadcast({
        type: "ANSWER_SAVED",
        questionId: question.id,
        transcript: combinedAnswer,
      });
      return;
    }

    const selectedOptionId = this.matchMcqOption(question, combinedAnswer);

    try {
      await interviewsService.upsertVoiceResponse({
        sessionId: this.interviewState.sessionId,
        questionId: question.id,
        transcript: combinedAnswer,
        selectedOptionId,
        realtimeEventId,
      });

      this.broadcast({
        type: "ANSWER_SAVED",
        questionId: question.id,
        transcript: combinedAnswer,
      });
    } catch (error) {
      this.logError("persist_question_answer_failed", error, {
        questionId: truncateId(question.id),
      });
    }
  }

  private async handleQuestionAnswer(
    questionIndex: number,
    question: InterviewQuestion,
    trimmed: string,
    realtimeEventId?: string,
  ) {
    if (!this.interviewState || this.evaluatingAnswer) {
      return;
    }

    this.evaluatingAnswer = true;

    try {
      this.appendConversation("user", trimmed);

      if (!this.interviewState.questionPartialAnswers) {
        this.interviewState.questionPartialAnswers = {};
      }
      if (!this.interviewState.questionFollowUpCounts) {
        this.interviewState.questionFollowUpCounts = {};
      }

      const priorUtterances =
        this.interviewState.questionPartialAnswers[question.id] ?? [];
      priorUtterances.push(trimmed);
      this.interviewState.questionPartialAnswers[question.id] = priorUtterances;

      const followUpCount =
        this.interviewState.questionFollowUpCounts[question.id] ?? 0;

      const evaluation = await evaluateCandidateAnswer({
        apiKey: this.env.OPENAI_API_KEY,
        question,
        latestUtterance: trimmed,
        priorUtterances: priorUtterances.slice(0, -1),
        followUpCount,
      });

      this.logTranscript("answer_evaluated", {
        questionId: question.id,
        questionIndex,
        sufficient: evaluation.sufficient,
        relevance: evaluation.relevance,
        followUpCount,
        answerPreview: previewText(evaluation.combinedAnswer),
      });

      if (evaluation.sufficient) {
        await this.persistQuestionAnswer(
          question,
          evaluation.combinedAnswer,
          realtimeEventId,
        );
        this.clearQuestionAttemptState(question.id);
        this.interviewState.awaitingAnswerForIndex = null;
        this.pendingAdvanceAfterAck = true;
        this.pendingAdvanceReason = "answer_sufficient";
        this.dispatchResponseCreate(
          buildAcknowledgeAnswerEvent(questionIndex),
          "acknowledge_answer",
          { questionId: question.id, questionIndex },
        );
      } else {
        this.interviewState.questionFollowUpCounts[question.id] =
          followUpCount + 1;
        this.interviewState.awaitingAnswerForIndex = null;
        this.dispatchResponseCreate(
          buildFollowUpAnswerEvent({
            question,
            questionIndex,
            candidateUtterance: trimmed,
            followUpInstruction: evaluation.followUpInstruction,
          }),
          "follow_up_answer",
          {
            questionId: question.id,
            questionIndex,
            followUpCount: followUpCount + 1,
            relevance: evaluation.relevance,
          },
        );
      }

      await this.persistState();
    } catch (error) {
      this.logError("handle_question_answer_failed", error, {
        questionId: question.id,
        questionIndex,
      });
    } finally {
      this.evaluatingAnswer = false;
    }
  }

  private async saveUserTranscript(
    transcript: string,
    realtimeEventId?: string,
  ) {
    if (!this.interviewState) {
      return;
    }

    const phase = this.interviewState.voicePhase ?? "questions";
    const trimmed = transcript.trim();
    if (!trimmed) {
      return;
    }

    if (phase === "intro" || phase === "awaiting_ready") {
      if (!this.welcomeIntroCompleted) {
        this.logTranscript("user_transcript_ignored_during_welcome", {
          phase,
          textPreview: previewText(trimmed),
        });
        return;
      }

      if (looksLikeNoise(trimmed)) {
        this.logTranscript("user_transcript_ignored_as_noise", {
          phase,
          textPreview: previewText(trimmed),
        });
        return;
      }
    }

    this.broadcastTranscript("user", trimmed);
    this.logTranscript("user_transcript_broadcast", {
      phase,
      textPreview: previewText(trimmed),
      textLength: trimmed.length,
    });

    if (phase === "intro" || phase === "awaiting_ready") {
      await this.handleIntroUtterance(trimmed, phase);
      return;
    }

    const questionIndex = this.getActiveQuestionIndex();
    const question = this.interviewState.questions[questionIndex];
    if (!question) {
      this.logTranscript("user_transcript_no_question", {
        phase,
        questionIndex,
        currentQuestionIndex: this.interviewState.currentQuestionIndex,
        awaitingAnswerForIndex: this.interviewState.awaitingAnswerForIndex,
        questionCount: this.interviewState.questions.length,
      });
      return;
    }

    if (this.interviewState.awaitingAnswerForIndex !== questionIndex) {
      this.logTranscript("user_transcript_display_only", {
        phase,
        questionIndex,
        awaitingAnswerForIndex: this.interviewState.awaitingAnswerForIndex,
        textPreview: previewText(trimmed),
      });
      return;
    }

    if (phase === "questions") {
      await this.handleQuestionAnswer(
        questionIndex,
        question,
        trimmed,
        realtimeEventId,
      );
    }
  }

  private async handleIntroUtterance(
    trimmed: string,
    phase: "intro" | "awaiting_ready",
  ) {
    if (!this.interviewState) {
      return;
    }

    try {
      const evaluation = await evaluateIntroUtterance({
        apiKey: this.env.OPENAI_API_KEY,
        utterance: trimmed,
      });

      this.logTranscript("intro_utterance_evaluated", {
        phase,
        ready: evaluation.ready,
        relevance: evaluation.relevance,
        textPreview: previewText(trimmed),
      });

      this.appendConversation("user", trimmed);

      if (evaluation.ready) {
        if (phase === "awaiting_ready") {
          this.interviewState.voicePhase = "questions";
          this.sendPhaseSessionUpdate("questions");
          await this.persistState();
          await this.askCurrentQuestion();
          return;
        }

        // phase === "intro": the candidate confirmed ready while the welcome
        // was still in progress. Latch intro_ready until the welcome response
        // completes (response.done) so the ready state survives hibernation.
        this.interviewState.voicePhase = "intro_ready";
        await this.persistState();
        return;
      }

      if (evaluation.relevance === "noise") {
        await this.persistState();
        return;
      }

      if (evaluation.followUpInstruction) {
        this.dispatchResponseCreate(
          buildIntroFollowUpEvent({
            candidateUtterance: trimmed,
            followUpInstruction: evaluation.followUpInstruction,
          }),
          "intro_follow_up",
          { phase, relevance: evaluation.relevance },
        );
      }

      await this.persistState();
    } catch (error) {
      this.logError("handle_intro_utterance_failed", error, {
        phase,
        textPreview: previewText(trimmed),
      });
    }
  }

  private matchMcqOption(
    question: InterviewQuestion,
    transcript: string,
  ): string | null {
    return matchMcqOption(question, transcript);
  }

  private getCurrentQuestion(): InterviewQuestion | null {
    if (!this.interviewState) {
      return null;
    }
    return (
      this.interviewState.questions[this.interviewState.currentQuestionIndex] ??
      null
    );
  }

  private detectQuestionIndexFromTranscript(transcript: string): number | null {
    if (!this.interviewState) {
      return null;
    }
    return detectQuestionIndexFromTranscript(
      this.interviewState.questions,
      transcript,
    );
  }

  private sendQuestionToClient(ws: WebSocket, index: number) {
    if (!this.interviewState) {
      return;
    }

    const question = this.interviewState.questions[index];
    if (!question) {
      return;
    }

    this.sendToClient(ws, {
      type: "QUESTION_CHANGED",
      index,
      questionId: question.id,
      question,
    });
  }

  private broadcastQuestion(index: number) {
    if (!this.interviewState) {
      return;
    }

    const question = this.interviewState.questions[index];
    if (!question) {
      return;
    }

    this.broadcast({
      type: "QUESTION_CHANGED",
      index,
      questionId: question.id,
      question,
    });
  }

  private async syncQuestionFromAssistantTranscript(transcript: string) {
    if (!this.interviewState) {
      return;
    }

    const phase = this.interviewState.voicePhase ?? "questions";
    if (
      phase !== "questions" &&
      phase !== "closing" &&
      phase !== "awaiting_end"
    ) {
      return;
    }

    const detectedIndex = this.detectQuestionIndexFromTranscript(transcript);
    const index = detectedIndex ?? this.interviewState.currentQuestionIndex;

    if (
      detectedIndex !== null &&
      detectedIndex !== this.interviewState.currentQuestionIndex
    ) {
      this.interviewState.currentQuestionIndex = detectedIndex;
      await this.persistState();
    }

    this.broadcastQuestion(index);
  }

  private async askCurrentQuestion() {
    const question = this.getCurrentQuestion();
    if (!question || !this.interviewState) {
      this.logTranscript("ask_current_question_skipped", {
        hasQuestion: Boolean(question),
        hasInterviewState: Boolean(this.interviewState),
        hasSideband: Boolean(this.sideband),
      });
      return;
    }

    if (!this.sideband) {
      this.logTranscript("ask_current_question_no_sideband", {
        questionIndex: this.interviewState.currentQuestionIndex,
      });
      return;
    }

    if (!this.welcomeIntroCompleted) {
      this.logTranscript("ask_current_question_blocked_welcome_pending", {
        questionIndex: this.interviewState.currentQuestionIndex,
      });
      return;
    }

    this.broadcastQuestion(this.interviewState.currentQuestionIndex);

    const payload = buildAskCurrentQuestionEvent(
      question,
      this.interviewState.currentQuestionIndex,
    );
    this.dispatchResponseCreate(payload, "ask_current_question", {
      questionIndex: this.interviewState.currentQuestionIndex,
      questionId: question.id,
    });
    this.startQuestionTimer();
  }

  private async startClosingPhase() {
    if (!this.interviewState || !this.sideband) {
      return;
    }

    this.interviewState.voicePhase = "closing";
    this.interviewState.closingStartedAtMs = Date.now();
    this.sendPhaseSessionUpdate("closing");
    await this.persistState();
    this.clearQuestionTimer();
    this.dispatchResponseCreate(
      buildClosingEvent({
        isPractice: this.interviewState.isPracticeMode,
      }),
      "closing",
    );
  }

  private async advanceQuestion() {
    if (!this.interviewState) {
      return;
    }

    const advanceReason = this.pendingAdvanceReason ?? "question_done";
    this.pendingAdvanceReason = null;
    this.logTranscript("question_advanced", {
      fromIndex: this.interviewState.currentQuestionIndex,
      advanceReason,
    });

    if (
      this.interviewState.currentQuestionIndex >=
      this.interviewState.questions.length - 1
    ) {
      await this.startClosingPhase();
      return;
    }

    this.interviewState.currentQuestionIndex += 1;
    await this.persistState();
    this.clearQuestionTimer();

    await this.askCurrentQuestion();
  }

  private async endPracticeSession() {
    if (!this.interviewState) {
      return;
    }

    this.interviewState.isPracticeMode = false;
    this.closeSideband({ intentional: true });
    this.broadcast({ type: "PRACTICE_ENDED" });
    this.clearQuestionTimer();
    this.durableState.storage.deleteAlarm().catch(() => undefined);
    await this.persistState();
  }

  private async completeInterview() {
    if (!this.interviewState || this.interviewState.status === "completed") {
      return;
    }

    this.logTranscript("complete_interview_start", {
      sessionId: this.interviewState.sessionId,
    });

    try {
      await this.flushResponsesToDatabase();

      this.interviewState.status = "completed";
      const cheatingSummary = this.buildCheatingSummary();

      await interviewsService.updateSessionVoiceMetadata(this.interviewState.sessionId, {
        cheatingSummary,
        realtimeSessionId: this.interviewState.realtimeSessionId,
      });

      const bundleAdvance = await interviewsService.advanceBundleRound(
        this.interviewState.sessionId,
      );

      if (!bundleAdvance) {
        await interviewsService.updateSessionStatus(this.interviewState.sessionId, "completed", {
          completedAt: new Date(),
          tabSwitches: cheatingSummary.tabSwitches ?? 0,
        });
      }

      if (this.env.INTERVIEW_EVALUATION_WORKFLOW) {
        this.env.INTERVIEW_EVALUATION_WORKFLOW.create({
          params: { sessionId: this.interviewState.sessionId },
        }).catch((error) =>
          this.logError("evaluation_workflow_create_failed", error),
        );
      }

      this.clearQuestionTimer();
      this.durableState.storage.deleteAlarm().catch(() => undefined);
      this.durableState.storage.delete("alarmPurpose").catch(() => undefined);
      await this.persistState();
      this.closeSideband({ intentional: true });
      this.closeClientSocket();
      this.broadcast({ type: "INTERVIEW_COMPLETED" });
      this.logTranscript("complete_interview_success", {
        bundleAdvanced: Boolean(bundleAdvance),
      });
    } catch (error) {
      this.logError("complete_interview_failed", error);
      this.broadcast({
        type: "ERROR",
        message: "Failed to complete interview. Please try again.",
      });
    }
  }

  private async markInterrupted() {
    if (!this.interviewState || this.interviewState.status === "completed") {
      return;
    }

    await this.flushResponsesToDatabase();

    const cheatingSummary = this.buildCheatingSummary();
    await interviewsService.updateSessionVoiceMetadata(this.interviewState.sessionId, {
      cheatingSummary,
      interruptedAt: new Date(),
      realtimeSessionId: this.interviewState.realtimeSessionId,
    });
    this.clearQuestionTimer();
    this.durableState.storage.deleteAlarm().catch(() => undefined);
    this.durableState.storage.delete("alarmPurpose").catch(() => undefined);
    await this.persistState();
    this.closeSideband({ intentional: true });
    this.closeClientSocket();
  }

  private closeClientSocket() {
    if (this.clientSocket) {
      try {
        this.clientSocket.close(WS_CLOSE_NORMAL, "interview ended");
      } catch {
        // ignore close errors
      }
      this.clientSocket = null;
    }
  }

  private buildCheatingSummary(): CheatingSummary {
    const counters = this.interviewState?.cheatingCounters ?? {};
    return buildCheatingSummary(counters);
  }

  private async recordCheatingEvent(
    eventType: CheatingEventType,
    metadata?: CheatingEventMetadata,
  ) {
    if (!this.interviewState) {
      return;
    }

    const now = Date.now();
    const lastAt = this.lastCheatingEventAt.get(eventType) ?? 0;
    if (now - lastAt < CHEATING_RATE_LIMIT_MS) {
      return;
    }
    this.lastCheatingEventAt.set(eventType, now);

    if (eventType === "WINDOW_BLUR") {
      this.focusLostStartedAt = now;
    }

    if (eventType === "TAB_SWITCHED" && this.focusLostStartedAt) {
      const seconds = Math.round((now - this.focusLostStartedAt) / 1000);
      this.interviewState.cheatingCounters.focusLostSeconds =
        (this.interviewState.cheatingCounters.focusLostSeconds ?? 0) + seconds;
      this.focusLostStartedAt = null;
    }

    this.interviewState.cheatingCounters[eventType] =
      (this.interviewState.cheatingCounters[eventType] ?? 0) + 1;

    await interviewsService.insertCheatingEvents([
      {
        sessionId: this.interviewState.sessionId,
        eventType,
        metadata,
      },
    ]);

    await this.persistState();
  }

  private appendConversation(role: "user" | "assistant", content: string) {
    if (!this.interviewState) {
      return;
    }

    const entry: ConversationEntry = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    this.interviewState.conversationHistory.push(entry);
  }

  private broadcast(message: DoClientMessage) {
    const clients = this.durableState.getWebSockets();
    const messageType = message.type;

    if (
      messageType === "TRANSCRIPT" ||
      messageType === "TRANSCRIPT_DELTA" ||
      messageType === "CONNECTED"
    ) {
      this.logTranscript("broadcast_to_clients", {
        messageType,
        clientCount: clients.length,
        role: message.role,
        textPreview:
          message.text !== undefined
            ? previewText(message.text, 80)
            : undefined,
        deltaPreview:
          message.delta !== undefined
            ? previewText(message.delta, 40)
            : undefined,
      });
    }

    for (const ws of clients) {
      this.sendToClient(ws, message);
    }
  }

  private broadcastTranscript(role: "user" | "assistant", text: string) {
    this.broadcast({ type: "TRANSCRIPT", role, text });
  }

  private broadcastTranscriptDelta(role: "user" | "assistant", delta: string) {
    this.broadcast({ type: "TRANSCRIPT_DELTA", role, delta });
  }

  private sendToClient(ws: WebSocket, message: DoClientMessage) {
    try {
      ws.send(serializeDoMessage(message));
    } catch {
      // ignore send failures on closed sockets
    }
  }
}
