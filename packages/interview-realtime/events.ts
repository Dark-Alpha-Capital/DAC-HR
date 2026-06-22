import { z } from "zod";
import { cheatingEventTypes } from "@workspace/db/enums";

const cheatingEventTypeSchema = z.enum(cheatingEventTypes);

export const clientToDoMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CALL_STARTED"),
    callId: z.string().min(1),
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
