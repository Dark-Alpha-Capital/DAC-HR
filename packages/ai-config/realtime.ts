import { formatOpenAIApiError } from "./openai-api-error";

export const REALTIME_MODEL = "gpt-realtime-2";
export const DEFAULT_REALTIME_VOICE = "alloy";

export interface CreateRealtimeSessionOptions {
  model?: string;
  voice?: string;
  instructions?: string;
  /** Worker route handlers should pass getServerOpenAIApiKey() when env binding differs from .dev.vars */
  apiKey?: string;
}

export interface RealtimeEphemeralSession {
  id: string;
  clientSecret: string;
  expiresAt: number;
  model: string;
}

interface ClientSecretsResponse {
  value?: string;
  client_secret?: {
    value: string;
    expires_at: number;
  };
  expires_at?: number;
}

export async function createRealtimeEphemeralSession(
  options: CreateRealtimeSessionOptions = {},
): Promise<RealtimeEphemeralSession> {
  const model = options.model ?? REALTIME_MODEL;
  const voice = options.voice ?? DEFAULT_REALTIME_VOICE;
  const apiKey = options.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please configure it in your environment variables.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model,
        instructions: options.instructions,
        reasoning: { effort: "low" },
        truncation: {
          type: "retention_ratio",
          retention_ratio: 0.7,
          token_limits: {
            post_instructions: 6000,
          },
        },
        audio: {
          input: {
            transcription: { model: "whisper-1" },
          },
          output: { voice },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI Realtime client secret request failed: ${formatOpenAIApiError(response.status, errorBody)}`,
    );
  }

  const data = (await response.json()) as ClientSecretsResponse;
  const clientSecret = data.value ?? data.client_secret?.value;

  if (!clientSecret) {
    throw new Error("OpenAI Realtime client secret did not return a token");
  }

  const expiresAt =
    data.client_secret?.expires_at ??
    data.expires_at ??
    Math.floor(Date.now() / 1000) + 60;

  return {
    id: crypto.randomUUID(),
    clientSecret,
    expiresAt,
    model,
  };
}

export function getRealtimeSidebandUrl(callId: string): string {
  return `wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`;
}

export function getRealtimeSidebandHttpUrl(callId: string): string {
  return `https://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`;
}
