type OpenAIErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string | null;
  };
  message?: string;
};

/** Last 4 chars of an API key for log correlation (never log full keys). */
export function openAIKeyFingerprint(apiKey: string | undefined): string | undefined {
  const trimmed = apiKey?.trim();
  if (!trimmed || trimmed.length < 8) {
    return undefined;
  }
  return `…${trimmed.slice(-4)}`;
}

export function formatOpenAIApiError(status: number, bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return `OpenAI request failed (HTTP ${status})`;
  }

  try {
    const parsed = JSON.parse(trimmed) as OpenAIErrorPayload;
    const nested = parsed.error;
    if (nested && typeof nested.message === "string") {
      const parts = [`HTTP ${status}`];
      if (nested.type) {
        parts.push(`type=${nested.type}`);
      }
      if (nested.code) {
        parts.push(`code=${nested.code}`);
      }
      parts.push(nested.message);
      return parts.join(" · ");
    }
    if (typeof parsed.message === "string") {
      return `HTTP ${status} · ${parsed.message}`;
    }
  } catch {
    // Plain-text body (e.g. SDP errors).
  }

  return `HTTP ${status} · ${trimmed.length <= 400 ? trimmed : `${trimmed.slice(0, 400)}…`}`;
}
