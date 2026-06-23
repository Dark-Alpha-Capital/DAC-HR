import { getOpenAIClient } from "./openai-client";

export const REALTIME_MODEL = "gpt-realtime-2";
export const DEFAULT_REALTIME_VOICE = "alloy";

export interface CreateRealtimeSessionOptions {
  model?: string;
  voice?: string;
  instructions?: string;
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

  // GA Realtime API: beta /v1/realtime/sessions was retired.
  getOpenAIClient();

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model,
        instructions: options.instructions,
        audio: {
          output: { voice },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI Realtime client secret request failed (${response.status}): ${errorBody}`,
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
