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
  | "intro"
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
}

export type ClientToDoMessage =
  | { type: "CALL_STARTED"; callId: string }
  | { type: "CHEATING_EVENT"; eventType: string; metadata?: Record<string, unknown> }
  | { type: "FULLSCREEN_STATE"; isFullscreen: boolean }
  | { type: "END_INTERVIEW" }
  | { type: "PING" };

export type DoToClientMessage =
  | { type: "CONNECTED"; state: Pick<InterviewState, "currentQuestionIndex" | "status" | "questions"> }
  | { type: "QUESTION_CHANGED"; index: number; questionId: string }
  | { type: "ALL_QUESTIONS_ASKED" }
  | { type: "TRANSCRIPT"; role: "user" | "assistant"; text: string }
  | { type: "TRANSCRIPT_DELTA"; role: "user" | "assistant"; delta: string }
  | { type: "ANSWER_SAVED"; questionId: string; transcript: string }
  | { type: "INTERVIEW_COMPLETED" }
  | { type: "ERROR"; message: string }
  | { type: "PONG" };
