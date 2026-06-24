/// <reference types="@cloudflare/workers-types" />

import { getRealtimeSidebandHttpUrl } from "@workspace/ai-config";
import { getQuestionsForInterviewSession } from "@workspace/db/queries";
import type { CheatingEventType, CheatingSummary } from "@workspace/db/enums";
import {
  getSessionById,
  insertCheatingEvents,
  syncVoiceResponsesForSession,
  updateSessionStatus,
  updateSessionVoiceMetadata,
  upsertVoiceResponse,
} from "@workspace/db/repositories/interview-session-repository";
import {
  parseClientMessage,
  serializeDoMessage,
} from "@workspace/interview-realtime/events";
import { evaluateCandidateAnswer, evaluateIntroUtterance, PRACTICE_QUESTIONS } from "@workspace/interview-realtime";
import {
  buildAskCurrentQuestionEvent,
  buildAcknowledgeAnswerEvent,
  buildClosingEvent,
  buildFollowUpAnswerEvent,
  buildIntroFollowUpEvent,
  buildRealtimeInstructions,
  buildSessionUpdateEvent,
  buildWelcomeIntroEvent,
} from "@workspace/interview-realtime/prompts";
import type {
  ConversationEntry,
  InterviewQuestion,
  InterviewState,
} from "@workspace/interview-realtime/types";

interface WorkflowBinding {
  create: (input: { params: Record<string, unknown> }) => Promise<unknown>;
}

interface InterviewSessionEnv {
  OPENAI_API_KEY: string;
  INTERVIEW_EVALUATION_WORKFLOW?: WorkflowBinding;
}

declare const WebSocketPair: {
  new(): { 0: WebSocket; 1: WebSocket };
};

const CHEATING_RATE_LIMIT_MS = 1000;
const VOICE_TRANSCRIPT_LOG_TOPIC = "voice-transcript";
const SIDEBAND_CONNECT_MAX_RETRIES = 3;
const SIDEBAND_RECONNECT_MAX_ATTEMPTS = 5;
const SIDEBAND_BACKOFF_BASE_MS = 1000;
const SIDEBAND_BACKOFF_MAX_MS = 30000;

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
  private welcomeIntroCompleted = false;
  private welcomeIntroFallbackTimer: ReturnType<typeof setTimeout> | null =
    null;
  private lastCheatingEventAt = new Map<string, number>();
  private focusLostStartedAt: number | null = null;
  private pendingAdvanceAfterAck = false;
  private evaluatingAnswer = false;

  constructor(state: DurableObjectState, env: InterviewSessionEnv) {
    this.durableState = state;
    this.env = env;
  }

  private logTranscript(
    action: string,
    data: Record<string, unknown> = {},
  ): void {
    console.info(
      JSON.stringify({
        level: "info",
        topic: VOICE_TRANSCRIPT_LOG_TOPIC,
        component: "InterviewSessionDO",
        action,
        sessionId: this.interviewState?.sessionId,
        voicePhase: this.interviewState?.voicePhase,
        ...data,
      }),
    );
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

    await this.ensureState(sessionId, token);

    const isPractice = url.searchParams.get("practice") === "1";
    if (isPractice) {
      this.applyPracticeMode();
    }

    this.logTranscript("client_websocket_connected", {
      conversationHistoryLength: this.interviewState!.conversationHistory.length,
      currentQuestionIndex: this.interviewState!.currentQuestionIndex,
    });

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
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

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const parsed = parseClientMessage(message);
    if (!parsed || !this.interviewState) {
      return;
    }

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
        const raw =
          typeof parsed.event === "string"
            ? parsed.event
            : JSON.stringify(parsed.event);
        void this.handleRealtimeEvent(raw, "client_dc");
        break;
      }
      case "CHEATING_EVENT":
        await this.recordCheatingEvent(parsed.eventType, parsed.metadata);
        break;
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
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ) {
    void ws;
    if (
      this.interviewState?.status !== "completed" &&
      !this.interviewState?.isPracticeMode
    ) {
      await this.markInterrupted();
    }
    this.closeSideband({ intentional: true });
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error(
      JSON.stringify({
        level: "error",
        component: "InterviewSessionDO",
        sessionId: this.interviewState?.sessionId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    void ws;
  }

  private async ensureState(sessionId: string, token: string) {
    const stored = await this.durableState.storage.get<InterviewState>(
      "interviewState",
    );
    if (stored && stored.sessionId === sessionId) {
      this.interviewState = {
        ...stored,
        voicePhase: stored.voicePhase ?? "questions",
        candidateReady: stored.candidateReady ?? false,
        awaitingAnswerForIndex: stored.awaitingAnswerForIndex ?? null,
        questionAnswers: stored.questionAnswers ?? {},
        questionPartialAnswers: stored.questionPartialAnswers ?? {},
        questionFollowUpCounts: stored.questionFollowUpCounts ?? {},
      };
      return;
    }

    const row = await getSessionById(sessionId);
    if (!row || row.session.token !== token) {
      throw new Error("Invalid interview session");
    }

    const questions = await getQuestionsForInterviewSession(
      row.session.roundId,
      row.session.id,
    );

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
      candidateReady: false,
      awaitingAnswerForIndex: null,
      questionAnswers: {},
      questionPartialAnswers: {},
      questionFollowUpCounts: {},
      roundName: row.round.name,
      positionName: row.position.name,
      candidateName: `${row.candidate.firstName} ${row.candidate.lastName}`,
    };

    if (row.session.status === "pending" || row.session.status === "invited") {
      await updateSessionStatus(sessionId, "in_progress", {
        startedAt: new Date(),
      });
    }

    await this.persistState();
  }

  private applyPracticeMode() {
    if (!this.interviewState) {
      return;
    }

    this.interviewState.isPracticeMode = true;
    this.interviewState.questions = PRACTICE_QUESTIONS;
    this.interviewState.voicePhase = "intro";
    this.interviewState.candidateReady = false;
    this.interviewState.awaitingAnswerForIndex = null;
    this.interviewState.currentQuestionIndex = 0;
    this.interviewState.conversationHistory = [];
    this.interviewState.questionAnswers = {};
    this.interviewState.questionPartialAnswers = {};
    this.interviewState.questionFollowUpCounts = {};
    this.welcomeIntroCompleted = false;
    this.pendingWelcomeIntro = false;
  }

  private resetVoiceSessionForNewCall() {
    if (!this.interviewState) {
      return;
    }

    this.interviewState.voicePhase = "intro";
    this.interviewState.candidateReady = false;
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
    this.evaluatingAnswer = false;
    this.welcomeIntroCompleted = false;
    this.pendingWelcomeIntro = false;

    this.logTranscript("voice_session_reset", {
      questionCount: this.interviewState.questions.length,
    });
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

    const delay = Math.min(
      SIDEBAND_BACKOFF_BASE_MS * 2 ** this.sidebandReconnectAttempt,
      SIDEBAND_BACKOFF_MAX_MS,
    );
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
      response = await fetch(getRealtimeSidebandHttpUrl(callId), {
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          Upgrade: "websocket",
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
    payload: Record<string, unknown>,
    reason: string,
    extra: Record<string, unknown> = {},
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
      responseModalities:
        payload.response && typeof payload.response === "object"
          ? (payload.response as Record<string, unknown>).modalities
          : undefined,
      responseInstructions:
        payload.response && typeof payload.response === "object"
          ? previewText(
              String(
                (payload.response as Record<string, unknown>).instructions ??
                  "",
              ),
              200,
            )
          : undefined,
      ...extra,
    });
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

  private logResponseMetrics() {
    if (!this.pendingResponseMetric) {
      return;
    }

    const doneAt = Date.now();
    const { reason, sentAt, firstAudioAt } = this.pendingResponseMetric;
    this.logTranscript("response_metrics", {
      reason,
      msToFirstAudio: firstAudioAt ? firstAudioAt - sentAt : null,
      msToDone: doneAt - sentAt,
    });
    this.pendingResponseMetric = null;
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
      outputModalities: sessionUpdate.session.output_modalities,
      voice:
        sessionUpdate.session.audio &&
        typeof sessionUpdate.session.audio === "object" &&
        "output" in sessionUpdate.session.audio
          ? (
              sessionUpdate.session.audio as Record<
                string,
                unknown
              >
            ).output
          : undefined,
      turnDetection:
        sessionUpdate.session.audio &&
        typeof sessionUpdate.session.audio === "object" &&
        "input" in sessionUpdate.session.audio
          ? (
              (
                sessionUpdate.session.audio as Record<
                  string,
                  unknown
                >
              ).input as Record<string, unknown>
            )?.turn_detection
          : undefined,
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

    this.logTranscript("sideband_connect_start", {
      callId,
      auth: "ephemeral_client_secret",
      isReconnect,
    });

    this.sidebandCredentials = { callId, clientSecret };

    if (!isReconnect) {
      this.interviewState.callId = callId;
      this.interviewState.realtimeSessionId = callId;
      await updateSessionVoiceMetadata(this.interviewState.sessionId, {
        realtimeSessionId: callId,
      });
    }

    this.detachSideband();

    const maxAttempts = isReconnect ? 1 : SIDEBAND_CONNECT_MAX_RETRIES + 1;
    let lastError: string | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(
          SIDEBAND_BACKOFF_BASE_MS * 2 ** (attempt - 1),
          SIDEBAND_BACKOFF_MAX_MS,
        );
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
  }

  private closeSideband(options?: { intentional?: boolean }) {
    this.cancelSidebandReconnect();

    if (options?.intentional) {
      this.sidebandIntentionalClose = true;
      this.sidebandCredentials = null;
      this.sidebandReconnectAttempt = 0;
      this.pendingResponseMetric = null;

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
    if (
      !this.interviewState ||
      !this.sideband ||
      this.welcomeIntroCompleted
    ) {
      return;
    }

    this.logTranscript("welcome_intro_resend");
    this.dispatchWelcomeIntro("welcome_intro_resend");
    await this.persistState();
  }

  private extractResponseStatus(
    event: Record<string, unknown>,
  ): string | undefined {
    const response = event.response;
    if (response && typeof response === "object") {
      const status = (response as Record<string, unknown>).status;
      if (typeof status === "string") {
        return status;
      }
    }
    return undefined;
  }

  private async handleWelcomeInterrupted(responseStatus?: string) {
    if (!this.interviewState || this.welcomeIntroCompleted) {
      return;
    }

    this.logTranscript("welcome_intro_interrupted", {
      responseStatus,
      candidateReady: this.interviewState.candidateReady,
    });

    if (this.interviewState.candidateReady) {
      this.welcomeIntroCompleted = true;
      this.interviewState.voicePhase = "questions";
      await this.persistState();
      await this.askCurrentQuestion();
      return;
    }

    await this.resendWelcomeIntro();
  }

  private async handleRealtimeEvent(
    raw: string,
    source: "sideband" | "client_dc",
  ) {
    if (source === "client_dc" && this.sideband) {
      return;
    }

    if (!this.interviewState) {
      return;
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = typeof event.type === "string" ? event.type : "";

    this.recordFirstAudioByte(type);

    // DEBUG: Log ALL sideband events to trace the response lifecycle
    this.logTranscript("sideband_event_raw", {
      source,
      eventType: type,
      eventKeys: Object.keys(event),
      responseStatus:
        event.response && typeof event.response === "object"
          ? (event.response as Record<string, unknown>).status
          : undefined,
      itemRole:
        event.item && typeof event.item === "object"
          ? (event.item as Record<string, unknown>).role
          : undefined,
      itemType:
        event.item && typeof event.item === "object"
          ? (event.item as Record<string, unknown>).type
          : undefined,
      deltaPreview:
        typeof event.delta === "string" ? previewText(event.delta, 80) : undefined,
      transcriptPreview:
        typeof event.transcript === "string"
          ? previewText(event.transcript, 120)
          : undefined,
    });

    if (type === "session.updated") {
      await this.sendWelcomeIntro();
      return;
    }

    if (type === "conversation.item.input_audio_transcription.delta") {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta.trim()) {
        this.broadcastTranscriptDelta("user", delta);
      }
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcript =
        typeof event.transcript === "string" ? event.transcript : "";
      if (transcript.trim()) {
        await this.saveUserTranscript(
          transcript,
          typeof event.event_id === "string" ? event.event_id : undefined,
        );
      }
      return;
    }

    if (
      type === "response.output_audio_transcript.delta" ||
      type === "response.audio_transcript.delta"
    ) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta.trim()) {
        this.broadcastTranscriptDelta("assistant", delta);
      }
      return;
    }

    if (
      type === "response.output_audio_transcript.done" ||
      type === "response.audio_transcript.done"
    ) {
      const transcript =
        typeof event.transcript === "string" ? event.transcript : "";
      if (transcript.trim()) {
        this.appendConversation("assistant", transcript);
        this.broadcastTranscript("assistant", transcript);
        this.syncQuestionFromAssistantTranscript(transcript);
      }
      return;
    }

    if (type === "response.created") {
      this.logTranscript("response_created", {
        responseId:
          event.response && typeof event.response === "object"
            ? (event.response as Record<string, unknown>).id
            : undefined,
        responseStatus:
          event.response && typeof event.response === "object"
            ? (event.response as Record<string, unknown>).status
            : undefined,
        responseOutput:
          event.response && typeof event.response === "object"
            ? (event.response as Record<string, unknown>).output
            : undefined,
      });
      return;
    }

    if (type === "response.output_item.added") {
      this.logTranscript("response_output_item_added", {
        outputIndex: event.output_index,
        itemRole:
          event.item && typeof event.item === "object"
            ? (event.item as Record<string, unknown>).role
            : undefined,
        itemType:
          event.item && typeof event.item === "object"
            ? (event.item as Record<string, unknown>).type
            : undefined,
        itemContent:
          event.item && typeof event.item === "object"
            ? (event.item as Record<string, unknown>).content
            : undefined,
      });
      return;
    }

    if (type === "response.output_item.done") {
      this.logTranscript("response_output_item_done", {
        outputIndex: event.output_index,
        itemRole:
          event.item && typeof event.item === "object"
            ? (event.item as Record<string, unknown>).role
            : undefined,
        itemType:
          event.item && typeof event.item === "object"
            ? (event.item as Record<string, unknown>).type
            : undefined,
      });
      return;
    }

    if (type === "response.content_part.added") {
      this.logTranscript("response_content_part_added", {
        outputIndex: event.output_index,
        contentIndex: event.content_index,
        partType:
          event.part && typeof event.part === "object"
            ? (event.part as Record<string, unknown>).type
            : undefined,
        partTranscript:
          event.part && typeof event.part === "object"
            ? (event.part as Record<string, unknown>).transcript
            : undefined,
      });
      return;
    }

    if (type === "response.content_part.done") {
      this.logTranscript("response_content_part_done", {
        outputIndex: event.output_index,
        contentIndex: event.content_index,
        partType:
          event.part && typeof event.part === "object"
            ? (event.part as Record<string, unknown>).type
            : undefined,
      });
      return;
    }

    if (type === "response.output_audio.delta") {
      this.logTranscript("response_output_audio_delta", {
        responseId: event.response_id,
        outputIndex: event.output_index,
        contentIndex: event.content_index,
        deltaLength:
          typeof event.delta === "string" ? event.delta.length : 0,
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
        errorCode:
          event.error && typeof event.error === "object"
            ? (event.error as Record<string, unknown>).code
            : undefined,
        errorMessage:
          event.error && typeof event.error === "object"
            ? (event.error as Record<string, unknown>).message
            : undefined,
      });
      if (this.interviewState?.voicePhase === "intro") {
        await this.handleWelcomeInterrupted(type);
      }
      return;
    }

    if (type === "response.done") {
      this.logResponseMetrics();
      const responseStatus = this.extractResponseStatus(event);
      this.logTranscript("response_done", {
        voicePhase: this.interviewState.voicePhase,
        awaitingAnswerForIndex: this.interviewState.awaitingAnswerForIndex,
        currentQuestionIndex: this.interviewState.currentQuestionIndex,
        responseStatus,
        usage:
          event.response && typeof event.response === "object"
            ? (event.response as Record<string, unknown>).usage
            : undefined,
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
        await this.askCurrentQuestion();
        return;
      }

      await this.handleResponseDone(responseStatus);
      return;
    }

    if (type === "error") {
      this.logTranscript("sideband_error_event", {
        eventType: type,
        errorCode:
          event.error && typeof event.error === "object"
            ? (event.error as Record<string, unknown>).code
            : undefined,
        errorMessage:
          event.error && typeof event.error === "object"
            ? (event.error as Record<string, unknown>).message
            : undefined,
        errorType:
          event.error && typeof event.error === "object"
            ? (event.error as Record<string, unknown>).type
            : undefined,
      });
      return;
    }
  }

  private async handleResponseDone(_responseStatus?: string) {
    if (!this.interviewState) {
      return;
    }

    const phase = this.interviewState.voicePhase ?? "questions";

    if (phase === "intro") {
      this.welcomeIntroCompleted = true;
      this.interviewState.voicePhase = this.interviewState.candidateReady
        ? "questions"
        : "awaiting_ready";
      await this.persistState();
      if (this.interviewState.candidateReady) {
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
      await this.persistState();
      this.broadcast({ type: "ALL_QUESTIONS_ASKED" });
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
      .filter((answer): answer is NonNullable<typeof answer> => answer !== null);
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
      await syncVoiceResponsesForSession({
        sessionId: this.interviewState.sessionId,
        answers,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          component: "InterviewSessionDO",
          action: "flushResponsesToDatabase",
          sessionId: this.interviewState.sessionId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
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
      await upsertVoiceResponse({
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
      console.error(
        JSON.stringify({
          level: "error",
          component: "InterviewSessionDO",
          action: "persistQuestionAnswer",
          sessionId: this.interviewState.sessionId,
          questionId: question.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
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
        this.dispatchResponseCreate(
          buildAcknowledgeAnswerEvent(question),
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
      this.interviewState.candidateReady = true;
      await this.persistState();

      if (phase === "awaiting_ready" || this.welcomeIntroCompleted) {
        this.interviewState.voicePhase = "questions";
        await this.persistState();
        await this.askCurrentQuestion();
      }
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
  }

  private matchMcqOption(
    question: InterviewQuestion,
    transcript: string,
  ): string | null {
    if (question.questionType !== "mcq" || !question.options?.length) {
      return null;
    }

    const normalized = transcript.toLowerCase();
    for (let index = 0; index < question.options.length; index++) {
      const option = question.options[index]!;
      const letter = String.fromCharCode(65 + index).toLowerCase();
      if (
        normalized.includes(`option ${letter}`) ||
        normalized.startsWith(`${letter} `) ||
        normalized.includes(option.text.toLowerCase())
      ) {
        return option.id;
      }
    }

    return null;
  }

  private getCurrentQuestion(): InterviewQuestion | null {
    if (!this.interviewState) {
      return null;
    }
    return this.interviewState.questions[this.interviewState.currentQuestionIndex] ?? null;
  }

  private detectQuestionIndexFromTranscript(transcript: string): number | null {
    if (!this.interviewState) {
      return null;
    }

    const normalized = transcript.toLowerCase().replace(/\s+/g, " ");
    let bestIndex: number | null = null;
    let bestScore = 0;

    for (let index = 0; index < this.interviewState.questions.length; index++) {
      const question = this.interviewState.questions[index]!;
      const questionText = question.questionText.toLowerCase().trim();
      if (!questionText) {
        continue;
      }

      const snippet = questionText.slice(0, Math.min(80, questionText.length));
      let score = 0;

      if (normalized.includes(snippet)) {
        score = snippet.length;
      } else {
        const words = snippet.split(/\s+/).filter((word) => word.length > 4);
        const matched = words.filter((word) => normalized.includes(word)).length;
        if (words.length > 0 && matched / words.length >= 0.5) {
          score = matched * 10;
        }
      }

      if (question.questionType === "mcq" && question.options?.length) {
        for (const option of question.options) {
          const optionText = option.text.toLowerCase().trim();
          if (optionText.length > 8 && normalized.includes(optionText.slice(0, 40))) {
            score += 20;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    return bestScore >= 20 ? bestIndex : null;
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
    if (phase !== "questions" && phase !== "closing" && phase !== "awaiting_end") {
      return;
    }

    const detectedIndex = this.detectQuestionIndexFromTranscript(transcript);
    const index =
      detectedIndex ?? this.interviewState.currentQuestionIndex;

    if (detectedIndex !== null && detectedIndex !== this.interviewState.currentQuestionIndex) {
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
  }

  private async startClosingPhase() {
    if (!this.interviewState || !this.sideband) {
      return;
    }

    this.interviewState.voicePhase = "closing";
    await this.persistState();
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

    if (
      this.interviewState.currentQuestionIndex >=
      this.interviewState.questions.length - 1
    ) {
      await this.startClosingPhase();
      return;
    }

    this.interviewState.currentQuestionIndex += 1;
    await this.persistState();

    await this.askCurrentQuestion();
  }

  private async endPracticeSession() {
    if (!this.interviewState) {
      return;
    }

    this.interviewState.isPracticeMode = false;
    this.closeSideband({ intentional: true });
    this.broadcast({ type: "PRACTICE_ENDED" });
    await this.persistState();
  }

  private async completeInterview() {
    if (!this.interviewState || this.interviewState.status === "completed") {
      return;
    }

    await this.flushResponsesToDatabase();

    this.interviewState.status = "completed";
    const cheatingSummary = this.buildCheatingSummary();

    await updateSessionStatus(this.interviewState.sessionId, "completed", {
      completedAt: new Date(),
      tabSwitches: cheatingSummary.tabSwitches ?? 0,
    });

    await updateSessionVoiceMetadata(this.interviewState.sessionId, {
      cheatingSummary,
      realtimeSessionId: this.interviewState.realtimeSessionId,
    });

    await this.persistState();
    this.closeSideband({ intentional: true });
    this.broadcast({ type: "INTERVIEW_COMPLETED" });
  }

  private async markInterrupted() {
    if (!this.interviewState || this.interviewState.status === "completed") {
      return;
    }

    await this.flushResponsesToDatabase();

    const cheatingSummary = this.buildCheatingSummary();
    await updateSessionVoiceMetadata(this.interviewState.sessionId, {
      cheatingSummary,
      interruptedAt: new Date(),
      realtimeSessionId: this.interviewState.realtimeSessionId,
    });
    await this.persistState();
    this.closeSideband({ intentional: true });
  }

  private buildCheatingSummary(): CheatingSummary {
    const counters = this.interviewState?.cheatingCounters ?? {};
    return {
      tabSwitches: counters.TAB_SWITCHED ?? 0,
      focusLostSeconds: counters.focusLostSeconds ?? 0,
      fullscreenExits: counters.FULLSCREEN_EXITED ?? 0,
      copyAttempts: counters.COPY_ATTEMPT ?? 0,
      pasteAttempts: counters.PASTE_ATTEMPT ?? 0,
    };
  }

  private async recordCheatingEvent(
    eventType: CheatingEventType,
    metadata?: Record<string, unknown>,
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

    await insertCheatingEvents([
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

  private broadcast(message: Record<string, unknown>) {
    const clients = this.durableState.getWebSockets();
    const messageType =
      typeof message.type === "string" ? message.type : "unknown";

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
          typeof message.text === "string"
            ? previewText(message.text, 80)
            : undefined,
        deltaPreview:
          typeof message.delta === "string"
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

  private sendToClient(ws: WebSocket, message: Record<string, unknown>) {
    try {
      ws.send(serializeDoMessage(message));
    } catch {
      // ignore send failures on closed sockets
    }
  }
}
