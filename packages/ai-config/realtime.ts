import { getOpenAIClient } from "./openai-client";

export const REALTIME_MODEL = "gpt-4o-realtime-preview-2024-12-17";
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

export async function createRealtimeEphemeralSession(
  options: CreateRealtimeSessionOptions = {},
): Promise<RealtimeEphemeralSession> {
  const model = options.model ?? REALTIME_MODEL;
  const voice = options.voice ?? DEFAULT_REALTIME_VOICE;

  const client = getOpenAIClient();
  const session = await client.beta.realtime.sessions.create({
    model: model as "gpt-4o-realtime-preview-2024-12-17",
    voice,
    instructions: options.instructions,
  });

  if (!session.client_secret?.value) {
    throw new Error("OpenAI Realtime session did not return a client secret");
  }

  return {
    id: session.id ?? crypto.randomUUID(),
    clientSecret: session.client_secret.value,
    expiresAt: session.client_secret.expires_at,
    model,
  };
}

export function getRealtimeSidebandUrl(callId: string): string {
  return `wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`;
}
