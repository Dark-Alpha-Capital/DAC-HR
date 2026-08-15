import { z } from "zod";
import { cheatingEventTypes } from "@workspace/db/enums";
import type { ClientToDoMessage } from "./types";

const cheatingEventTypeSchema = z.enum(cheatingEventTypes);

export const clientToDoMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("REALTIME_EVENT"),
    event: z.union([z.string(), z.record(z.string(), z.unknown())]),
  }),
  z.object({
    type: z.literal("CALL_STARTED"),
    callId: z.string().min(1),
    clientSecret: z.string().min(1),
  }),
  z.object({
    type: z.literal("CHEATING_EVENT"),
    eventType: cheatingEventTypeSchema,
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("FULLSCREEN_STATE"),
    isFullscreen: z.boolean(),
  }),
  z.object({
    type: z.literal("END_INTERVIEW"),
  }),
  z.object({
    type: z.literal("PING"),
  }),
]);

export type ParsedClientToDoMessage = z.infer<typeof clientToDoMessageSchema>;

export function parseClientMessage(
  raw: string | ArrayBuffer,
): ParsedClientToDoMessage | null {
  try {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    const json: unknown = JSON.parse(text);
    const parsed = clientToDoMessageSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function serializeDoMessage(message: Record<string, unknown>): string {
  return JSON.stringify(message);
}

const conversationEntrySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
});

const questionOptionSchema = z
  .object({
    id: z.string(),
    text: z.string(),
  })
  .passthrough();

const interviewQuestionSchema = z
  .object({
    id: z.string(),
    questionText: z.string(),
    questionType: z.string(),
    category: z.string().nullable(),
    timeLimitSeconds: z.number().int().nullable().optional(),
    options: z.array(questionOptionSchema).nullable().optional(),
  })
  .passthrough();

const voiceInterviewPhaseSchema = z.enum([
  "intro",
  "awaiting_ready",
  "questions",
  "closing",
  "awaiting_end",
]);

const connectedStateSchema = z
  .object({
    currentQuestionIndex: z.number().int().optional(),
    status: z.string().optional(),
    questions: z.array(interviewQuestionSchema).optional(),
    voicePhase: voiceInterviewPhaseSchema.optional(),
    conversationHistory: z.array(conversationEntrySchema).optional(),
  })
  .passthrough();

/**
 * Single source of truth for DO→client messages. The client dispatches on
 * `type` and reads the narrowed payload from the parsed result; malformed
 * payloads fail fast (null) instead of surfacing as typed-but-undefined fields.
 */
export const doToClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CONNECTED"), state: connectedStateSchema }),
  z.object({ type: z.literal("INTRO_STARTED") }),
  z.object({
    type: z.literal("QUESTION_CHANGED"),
    index: z.number().int(),
    questionId: z.string(),
    question: interviewQuestionSchema.optional(),
  }),
  z.object({ type: z.literal("ALL_QUESTIONS_ASKED") }),
  z.object({
    type: z.literal("TRANSCRIPT"),
    role: z.enum(["user", "assistant"]),
    text: z.string(),
  }),
  z.object({
    type: z.literal("TRANSCRIPT_DELTA"),
    role: z.enum(["user", "assistant"]),
    delta: z.string(),
  }),
  z.object({
    type: z.literal("ANSWER_SAVED"),
    questionId: z.string(),
    transcript: z.string(),
  }),
  z.object({ type: z.literal("INTERVIEW_COMPLETED") }),
  z.object({ type: z.literal("PRACTICE_ENDED") }),
  z.object({ type: z.literal("SESSION_TIME_LIMIT") }),
  z.object({ type: z.literal("QUESTION_TIMED_OUT"), questionId: z.string() }),
  z.object({ type: z.literal("ERROR"), message: z.string() }),
  z.object({ type: z.literal("PONG") }),
]);

export type DoToClientMessage = z.infer<typeof doToClientMessageSchema>;

/**
 * Client-safe parser for DO→client WebSocket messages. Returns the message
 * (narrowed by the schema) or null when the payload isn't a valid message.
 * This is the single seam the client should dispatch on.
 */
export function parseDoMessage(
  raw: string | ArrayBuffer,
): DoToClientMessage | null {
  try {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    const json: unknown = JSON.parse(text);
    const parsed = doToClientMessageSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Client-safe typed send over the DO WebSocket. Only valid `ClientToDoMessage`
 * payloads are accepted; nothing is sent unless the socket is open.
 */
/**
 * A minimal WebSocket-shaped handle the client can send DO messages over.
 * Matches both a native `WebSocket` and the hook's reconnecting `SessionSocket`.
 */
export interface DoMessageSocket {
  readyState: number;
  send(data: string): void;
}

export function sendDoMessage(ws: DoMessageSocket, message: ClientToDoMessage) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify(message));
}
