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
export function openAIKeyFingerprint(
  apiKey: string | undefined,
): string | undefined {
  const trimmed = apiKey?.trim();
  if (!trimmed || trimmed.length < 8) {
    return undefined;
  }
  return `…${trimmed.slice(-4)}`;
}

export type ParsedOpenAIError = {
  formatted: string;
  type?: string;
  code?: string;
  message?: string;
};

/**
 * Single structured parser for OpenAI error responses. Every caller used to
 * re-parse the body to pull `type`/`code`/`message`; this owns that contract.
 */
export function parseOpenAIError(
  status: number,
  bodyText: string,
): ParsedOpenAIError {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return { formatted: `OpenAI request failed (HTTP ${status})` };
  }

  let type: string | undefined;
  let code: string | undefined;
  let message: string | undefined;

  try {
    // SAFETY: OpenAI error bodies are JSON matching the payload shape below;
    // every field read is optional so malformed bodies degrade gracefully.
    const parsed = JSON.parse(trimmed) as OpenAIErrorPayload;
    const nested = parsed.error;
    if (nested) {
      type = nested.type;
      code = nested.code;
      message = nested.message;
    }
    if (parsed.message !== undefined && message === undefined) {
      message = parsed.message;
    }
  } catch {
    // Plain-text body (e.g. SDP errors).
  }

  if (message !== undefined) {
    const parts = [`HTTP ${status}`];
    if (type) {
      parts.push(`type=${type}`);
    }
    if (code) {
      parts.push(`code=${code}`);
    }
    parts.push(message);
    return { formatted: parts.join(" · "), type, code, message };
  }

  return {
    formatted: `HTTP ${status} · ${
      trimmed.length <= 400 ? trimmed : `${trimmed.slice(0, 400)}…`
    }`,
    type,
    code,
    message,
  };
}

export function formatOpenAIApiError(status: number, bodyText: string): string {
  return parseOpenAIError(status, bodyText).formatted;
}

const REALTIME_CALLS_QUOTA_HELP =
  "Realtime WebRTC calls bill separately from client_secrets token minting. " +
  "In platform.openai.com → Billing: confirm prepaid balance > $0 (or enable auto-recharge), " +
  "monthly hard limit is above current spend, and the API key org/project matches billing. " +
  "See https://platform.openai.com/docs/guides/error-codes/api-errors";

/** User-facing error for browser POST /v1/realtime/calls (SDP exchange). */
export function formatRealtimeCallsError(
  status: number,
  bodyText: string,
): string {
  const { formatted, type, code } = parseOpenAIError(status, bodyText);

  if ((code ?? type) === "insufficient_quota") {
    return `${formatted} — ${REALTIME_CALLS_QUOTA_HELP}`;
  }

  return formatted;
}
