import { z } from "zod";
import type { AgentConfig, DeliveryMode } from "@workspace/db/enums";
import type { QuestionOption } from "@workspace/db/question-types";

/**
 * An arbitrary JSON object. Parsed at the message boundary by the zod schemas
 * in `events.ts`; kept opaque here because payloads are forward-sent as-is.
 */
export const jsonObjectSchema = z.record(z.string(), z.unknown());
export type JsonObject = z.infer<typeof jsonObjectSchema>;

export interface InterviewQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds?: number | null;
  options?: QuestionOption[] | null;
}

export type VoiceInterviewPhase =
  | "intro"
  | "awaiting_ready"
  | "intro_ready"
  | "questions"
  | "closing"
  | "awaiting_end";

export type InterviewSessionDoStatus = "active" | "paused" | "completed";

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface InterviewState {
  sessionId: string;
  token: string;
  deliveryMode: DeliveryMode;
  agentConfig?: AgentConfig;
  currentQuestionIndex: number;
  questions: InterviewQuestion[];
  conversationHistory: ConversationEntry[];
  cheatingCounters: Record<string, number>;
  isFullscreen: boolean;
  realtimeSessionId?: string;
  callId?: string;
  status: InterviewSessionDoStatus;
  roundName?: string;
  positionName?: string;
  candidateName?: string;
  voicePhase?: VoiceInterviewPhase;
  /** True once the welcome intro response completed or was interrupted. */
  welcomeIntroSent?: boolean;
  /**
   * Persisted sideband descriptor so a waking DO can reattach its orphaned
   * voice engine after hibernation. Cleared on intentional close.
   */
  sideband?: {
    callId: string;
    clientSecret: string;
    reconnectAttempt: number;
    status: "connecting" | "open" | "closed";
  };
  awaitingAnswerForIndex?: number | null;
  /** questionId → answer transcript (excludes intro / chit-chat) */
  questionAnswers?: Record<string, string>;
  /** questionId → utterances collected while waiting for a sufficient answer */
  questionPartialAnswers?: Record<string, string[]>;
  /** questionId → follow-up count for the current question */
  questionFollowUpCounts?: Record<string, number>;
  /** Practice session — answers are not persisted */
  isPracticeMode?: boolean;
  /** Epoch ms when the closing phase started (auto-complete timing). */
  closingStartedAtMs?: number;
  /** Monotonic per-session connection counter (reconnect instrumentation). */
  connectionGeneration?: number;
  /** Epoch ms of recent connection attempts (reconnect rate-limit guard). */
  reconnectAttempts?: number[];
}

export type ClientToDoMessage =
  | { type: "CALL_STARTED"; callId: string; clientSecret: string }
  | { type: "REALTIME_EVENT"; event: string | JsonObject }
  | {
      type: "CHEATING_EVENT";
      eventType: string;
      metadata?: JsonObject;
    }
  | { type: "FULLSCREEN_STATE"; isFullscreen: boolean }
  | { type: "END_INTERVIEW" }
  | { type: "PING" };
