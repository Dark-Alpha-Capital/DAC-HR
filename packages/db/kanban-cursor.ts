export type KanbanCursorPayload = {
  updatedAt: string;
  id: string;
};

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeUpdatedAt(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
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
    // SAFETY: the decoded text is JSON with at most `updatedAt` and `id`
    // fields; the shape cast lets us read and validate each field.
    const parsed = JSON.parse(decodeBase64Url(cursor)) as {
      updatedAt?: unknown;
      id?: unknown;
    };

    const updatedAt = normalizeUpdatedAt(parsed.updatedAt);
    if (typeof parsed.id !== "string" || !parsed.id || !updatedAt) {
      return null;
    }

    return { updatedAt, id: parsed.id };
  } catch {
    return null;
  }
}
