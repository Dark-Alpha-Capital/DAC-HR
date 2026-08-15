import type { AgentConfig, DeliveryMode } from "@workspace/db/enums";
import type { QuestionOption } from "@workspace/db/question-types";

export interface InterviewQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds?: number | null;
  options?: QuestionOption[] | null;
}

export type VoiceInterviewPhase =
  "intro" | "awaiting_ready" | "questions" | "closing" | "awaiting_end";

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
  candidateReady?: boolean;
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
  | { type: "REALTIME_EVENT"; event: string | Record<string, unknown> }
  | {
      type: "CHEATING_EVENT";
      eventType: string;
      metadata?: Record<string, unknown>;
    }
  | { type: "FULLSCREEN_STATE"; isFullscreen: boolean }
  | { type: "END_INTERVIEW" }
  | { type: "PING" };
