/// <reference types="@cloudflare/workers-types" />

import { getRealtimeSidebandUrl } from "@workspace/ai-config";
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
  new (): { 0: WebSocket; 1: WebSocket };
};

const CHEATING_RATE_LIMIT_MS = 1000;

export class InterviewSessionDO implements DurableObject {
  private durableState: DurableObjectState;
  private env: InterviewSessionEnv;
  private interviewState: InterviewState | null = null;
  private sideband: WebSocket | null = null;
  private lastCheatingEventAt = new Map<string, number>();
  private focusLostStartedAt: number | null = null;

  constructor(state: DurableObjectState, env: InterviewSessionEnv) {
    this.durableState = state;
    this.env = env;
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

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.durableState.acceptWebSocket(server);

    this.sendToClient(server, {
      type: "CONNECTED",
      state: {
        currentQuestionIndex: this.interviewState!.currentQuestionIndex,
        status: this.interviewState!.status,
        questions: this.interviewState!.questions,
      },
    });

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
        await this.connectSideband(parsed.callId);
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

  private async persistState() {
    if (!this.interviewState) {
      return;
    }
    await this.durableState.storage.put("interviewState", this.interviewState);
  }

  private async connectSideband(callId: string) {
    if (!this.interviewState || !this.env.OPENAI_API_KEY) {
      return;
    }

    this.interviewState.callId = callId;
    this.interviewState.realtimeSessionId = callId;
    await updateSessionVoiceMetadata(this.interviewState.sessionId, {
      realtimeSessionId: callId,
    });

    this.closeSideband();

    const sideband = new WebSocket(
      getRealtimeSidebandUrl(callId),
      // @ts-expect-error Cloudflare Workers supports header options on WebSocket
      {
        headers: {
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
      },
    );

    sideband.addEventListener("open", () => {
      const instructions = buildRealtimeInstructions({
        roundName: this.interviewState?.roundName,
        positionName: this.interviewState?.positionName,
        candidateName: this.interviewState?.candidateName,
        questions: this.interviewState?.questions ?? [],
        agentConfig: this.interviewState?.agentConfig,
      });

      sideband.send(
        JSON.stringify(
          buildSessionUpdateEvent(
            instructions,
            this.interviewState?.agentConfig?.voice,
          ),
        ),
      );
      this.interviewState.voicePhase = "intro";
      void this.persistState();
      sideband.send(
        JSON.stringify(
          buildWelcomeIntroEvent({
            candidateName: this.interviewState.candidateName,
            positionName: this.interviewState.positionName,
            roundName: this.interviewState.roundName,
          }),
        ),
      );
      this.broadcast({ type: "INTRO_STARTED" });
    });

    sideband.addEventListener("message", (event) => {
      void this.handleSidebandMessage(String(event.data));
    });

    sideband.addEventListener("close", () => {
      this.sideband = null;
    });

    this.sideband = sideband;
    await this.persistState();
  }

  private closeSideband() {
    if (this.sideband) {
      try {
        this.sideband.close();
      } catch {
        // ignore close errors
      }
      this.sideband = null;
    }
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

    if (type === "conversation.item.input_audio_transcription.delta") {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta.trim()) {
        this.broadcast({ type: "TRANSCRIPT_DELTA", role: "user", delta });
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

    if (type === "response.output_audio_transcript.done" || type === "response.audio_transcript.done") {
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
      await this.handleResponseDone();
    }
  }

  private async handleResponseDone() {
    if (!this.interviewState) {
      return;
    }

    const phase = this.interviewState.voicePhase ?? "questions";

    if (phase === "intro") {
      this.interviewState.voicePhase = this.interviewState.candidateReady
        ? "questions"
        : "awaiting_ready";
      await this.persistState();
      if (this.interviewState.candidateReady) {
        await this.askCurrentQuestion();
      }
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

  private getNextAnswerQuestionIndex(): number {
    if (!this.interviewState) {
      return -1;
    }

    return this.interviewState.conversationHistory.filter(
      (entry) => entry.role === "user",
    ).length;
  }

  private buildAnswersFromConversation() {
    if (!this.interviewState) {
      return [];
    }

    const userEntries = this.interviewState.conversationHistory.filter(
      (entry) => entry.role === "user",
    );

    return userEntries
      .map((entry, index) => {
        const question = this.interviewState!.questions[index];
        if (!question) {
          return null;
        }

        return {
          questionId: question.id,
          transcript: entry.content,
          selectedOptionId: this.matchMcqOption(question, entry.content),
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

    if (phase === "intro") {
      this.interviewState.candidateReady = true;
      this.broadcastTranscript("user", trimmed);
      return;
    }

    if (phase === "awaiting_ready") {
      this.broadcastTranscript("user", trimmed);
      this.interviewState.voicePhase = "questions";
      await this.persistState();
      await this.askCurrentQuestion();
      return;
    }

    const questionIndex = this.getNextAnswerQuestionIndex();
    const question = this.interviewState.questions[questionIndex];
    if (!question) {
      return;
    }

    if (this.interviewState.awaitingAnswerForIndex !== questionIndex) {
      return;
    }

    this.appendConversation("user", trimmed);
    this.broadcastTranscript("user", trimmed);

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
    if (!question || !this.sideband || !this.interviewState) {
      return;
    }

    this.broadcastQuestion(this.interviewState.currentQuestionIndex);
    this.interviewState.awaitingAnswerForIndex = null;
    await this.persistState();
    this.sideband.send(
      JSON.stringify(
        buildAskCurrentQuestionEvent(
          question,
          this.interviewState.currentQuestionIndex,
        ),
      ),
    );
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
    for (const ws of this.durableState.getWebSockets()) {
      this.sendToClient(ws, message);
    }
  }

  private broadcastTranscript(role: "user" | "assistant", text: string) {
    this.broadcast({ type: "TRANSCRIPT", role, text });
  }

  private sendToClient(ws: WebSocket, message: Record<string, unknown>) {
    try {
      ws.send(serializeDoMessage(message));
    } catch {
      // ignore send failures on closed sockets
    }
  }
}
