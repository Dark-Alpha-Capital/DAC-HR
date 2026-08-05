import { z } from "zod";
import { cheatingEventTypes } from "@workspace/db/enums";
import type { ClientToDoMessage, DoToClientMessage } from "./types";

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

const doMessageTypes = new Set<string>([
  "CONNECTED",
  "INTRO_STARTED",
  "QUESTION_CHANGED",
  "ALL_QUESTIONS_ASKED",
  "TRANSCRIPT",
  "TRANSCRIPT_DELTA",
  "ANSWER_SAVED",
  "INTERVIEW_COMPLETED",
  "PRACTICE_ENDED",
  "SESSION_TIME_LIMIT",
  "QUESTION_TIMED_OUT",
  "ERROR",
  "PONG",
]);

/**
 * Client-safe parser for DO→client WebSocket messages. Returns the message
 * (narrowed by the `DoToClientMessage` union) or null when the payload isn't a
 * known message. This is the single seam the client should dispatch on.
 */
export function parseDoMessage(
  raw: string | ArrayBuffer,
): DoToClientMessage | null {
  try {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    const json: unknown = JSON.parse(text);
    if (!json || typeof json !== "object") {
      return null;
    }
    const type = (json as { type?: unknown }).type;
    if (typeof type !== "string" || !doMessageTypes.has(type)) {
      return null;
    }
    return json as DoToClientMessage;
  } catch {
    return null;
  }
}

/**
 * Client-safe typed send over the DO WebSocket. Only valid `ClientToDoMessage`
 * payloads are accepted; nothing is sent unless the socket is open.
 */
export function sendDoMessage(ws: WebSocket, message: ClientToDoMessage) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify(message));
}
