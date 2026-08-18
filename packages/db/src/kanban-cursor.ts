import { z } from "zod";

export type KanbanCursorPayload = {
  updatedAt: string;
  id: string;
};

const kanbanCursorPayloadSchema = z.object({
  updatedAt: z.union([
    z.string().min(1),
    z.number().finite().transform(String),
  ]),
  id: z.string().min(1),
});

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeKanbanCursor(payload: KanbanCursorPayload): string {
  return encodeBase64Url(
    JSON.stringify({
      updatedAt: String(payload.updatedAt),
      id: payload.id,
    }),
  );
}

export function decodeKanbanCursor(cursor: string): KanbanCursorPayload | null {
  try {
    const parsed = kanbanCursorPayloadSchema.safeParse(
      JSON.parse(decodeBase64Url(cursor)),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
