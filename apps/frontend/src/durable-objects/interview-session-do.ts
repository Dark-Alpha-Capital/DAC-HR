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
import {
  buildAskCurrentQuestionEvent,
  buildClosingEvent,
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
  private pendingWelcomeIntro = false;
  private welcomeIntroCompleted = false;
  private welcomeIntroFallbackTimer: ReturnType<typeof setTimeout> | null =
    null;
  private lastCheatingEventAt = new Map<string, number>();
  private focusLostStartedAt: number | null = null;

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
        this.resetVoiceSessionForNewCall();
        await this.persistState();
        await this.connectSideband(parsed.callId, parsed.clientSecret);
        break;
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
        await this.completeInterview();
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
    if (this.interviewState?.status !== "completed") {
      await this.markInterrupted();
    }
    this.closeSideband();
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

    if (this.interviewState.awaitingAnswerForIndex !== null) {
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

  private async connectSideband(callId: string, clientSecret: string) {
    if (!this.interviewState || !clientSecret) {
      this.logTranscript("sideband_connect_skipped", {
        callId,
        hasInterviewState: Boolean(this.interviewState),
        hasClientSecret: Boolean(clientSecret),
      });
      return;
    }

    this.logTranscript("sideband_connect_start", {
      callId,
      auth: "ephemeral_client_secret",
    });

    this.interviewState.callId = callId;
    this.interviewState.realtimeSessionId = callId;
    await updateSessionVoiceMetadata(this.interviewState.sessionId, {
      realtimeSessionId: callId,
    });

    this.closeSideband();

    let response: Response;
    try {
      response = await fetch(getRealtimeSidebandHttpUrl(callId), {
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          Upgrade: "websocket",
        },
      });
    } catch (error) {
      this.logTranscript("sideband_connect_fetch_error", {
        callId,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const sideband = response.webSocket;
    if (!sideband) {
      const errorBody = await response.text().catch(() => "");
      this.logTranscript("sideband_connect_rejected", {
        callId,
        status: response.status,
        statusText: response.statusText,
        bodyPreview: errorBody.slice(0, 300),
      });
      return;
    }

    sideband.accept();
    this.logTranscript("sideband_open", { callId, via: "fetch_upgrade" });

    sideband.addEventListener("message", (event) => {
      void this.handleSidebandMessage(String(event.data));
    });

    sideband.addEventListener("close", (event) => {
      this.logTranscript("sideband_close", {
        callId,
        code: "code" in event ? event.code : undefined,
        reason: "reason" in event ? event.reason : undefined,
      });
      this.sideband = null;
    });

    sideband.addEventListener("error", () => {
      this.logTranscript("sideband_error", { callId });
    });

    this.sideband = sideband;

    if (this.interviewState) {
      const instructions = buildRealtimeInstructions({
        roundName: this.interviewState.roundName,
        positionName: this.interviewState.positionName,
        candidateName: this.interviewState.candidateName,
        questions: this.interviewState.questions,
        agentConfig: this.interviewState.agentConfig,
      });

      this.interviewState.voicePhase = "intro";
      this.pendingWelcomeIntro = true;

      sideband.send(
        JSON.stringify(
          buildSessionUpdateEvent(
            instructions,
            this.interviewState.agentConfig?.voice,
          ),
        ),
      );

      this.welcomeIntroFallbackTimer = setTimeout(() => {
        void this.sendWelcomeIntro();
      }, 2000);
    }

    await this.persistState();
  }

  private closeSideband() {
    if (this.welcomeIntroFallbackTimer) {
      clearTimeout(this.welcomeIntroFallbackTimer);
      this.welcomeIntroFallbackTimer = null;
    }
    this.pendingWelcomeIntro = false;

    if (this.sideband) {
      try {
        this.sideband.close();
      } catch {
        // ignore close errors
      }
      this.sideband = null;
    }
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

    this.sideband.send(
      JSON.stringify(
        buildWelcomeIntroEvent({
          candidateName: this.interviewState.candidateName,
          positionName: this.interviewState.positionName,
          roundName: this.interviewState.roundName,
        }),
      ),
    );
    this.logTranscript("response_create_sent", { reason: "welcome_intro" });
    this.broadcast({ type: "INTRO_STARTED" });
    await this.persistState();
  }

  private async handleSidebandMessage(raw: string) {
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

    const isTranscriptEvent =
      type.includes("transcript") || type.includes("transcription");
    if (isTranscriptEvent || type === "response.done" || type === "session.updated") {
      this.logTranscript("sideband_event", {
        eventType: type,
        eventKeys: Object.keys(event),
        deltaPreview:
          typeof event.delta === "string" ? previewText(event.delta, 80) : undefined,
        transcriptPreview:
          typeof event.transcript === "string"
            ? previewText(event.transcript, 120)
            : undefined,
      });
    }

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

    if (type === "response.done") {
      this.logTranscript("sideband_response_done", {
        voicePhase: this.interviewState.voicePhase,
        awaitingAnswerForIndex: this.interviewState.awaitingAnswerForIndex,
        currentQuestionIndex: this.interviewState.currentQuestionIndex,
      });
      await this.handleResponseDone();
      return;
    }

    if (type) {
      const looksTranscriptRelated =
        type.includes("transcript") ||
        type.includes("transcription") ||
        type.startsWith("conversation.item");
      if (looksTranscriptRelated) {
        this.logTranscript("sideband_event_unhandled", {
          eventType: type,
          eventKeys: Object.keys(event),
        });
      }
    }
  }

  private async handleResponseDone() {
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
    if (!this.interviewState) {
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

  private async advanceAfterAnswer() {
    if (!this.interviewState || this.interviewState.voicePhase !== "questions") {
      return;
    }

    await this.advanceQuestion();
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

    if (phase === "intro") {
      this.interviewState.candidateReady = true;
      this.appendConversation("user", trimmed);
      await this.persistState();
      return;
    }

    if (phase === "awaiting_ready") {
      this.interviewState.candidateReady = true;
      this.appendConversation("user", trimmed);
      this.interviewState.voicePhase = "questions";
      await this.persistState();
      await this.askCurrentQuestion();
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

    this.appendConversation("user", trimmed);
    if (!this.interviewState.questionAnswers) {
      this.interviewState.questionAnswers = {};
    }
    this.interviewState.questionAnswers[question.id] = trimmed;

    const selectedOptionId = this.matchMcqOption(question, trimmed);

    try {
      await upsertVoiceResponse({
        sessionId: this.interviewState.sessionId,
        questionId: question.id,
        transcript: trimmed,
        selectedOptionId,
        realtimeEventId,
      });

      this.broadcast({
        type: "ANSWER_SAVED",
        questionId: question.id,
        transcript: trimmed,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          component: "InterviewSessionDO",
          action: "saveUserTranscript",
          sessionId: this.interviewState.sessionId,
          questionId: question.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    if (phase === "questions") {
      this.interviewState.awaitingAnswerForIndex = null;
      await this.advanceAfterAnswer();
    }
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
    this.logTranscript("response_create_sent", {
      reason: "ask_current_question",
      questionIndex: this.interviewState.currentQuestionIndex,
      questionId: question.id,
    });
    this.sideband.send(JSON.stringify(payload));

    this.interviewState.awaitingAnswerForIndex =
      this.interviewState.currentQuestionIndex;
    await this.persistState();
  }

  private async startClosingPhase() {
    if (!this.interviewState || !this.sideband) {
      return;
    }

    this.interviewState.voicePhase = "closing";
    await this.persistState();
    this.sideband.send(JSON.stringify(buildClosingEvent()));
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
    this.closeSideband();
    this.broadcast({ type: "INTERVIEW_COMPLETED" });

    await this.env.INTERVIEW_EVALUATION_WORKFLOW?.create({
      params: { sessionId: this.interviewState.sessionId },
    });
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
    this.closeSideband();
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
