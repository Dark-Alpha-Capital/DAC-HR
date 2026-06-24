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

export function encodeKanbanCursor(payload: KanbanCursorPayload): string {
  return encodeBase64Url(JSON.stringify(payload));
}

export function decodeKanbanCursor(cursor: string): KanbanCursorPayload | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(cursor)) as KanbanCursorPayload;

    if (
      typeof parsed.updatedAt !== "string" ||
      typeof parsed.id !== "string" ||
      !parsed.id
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
