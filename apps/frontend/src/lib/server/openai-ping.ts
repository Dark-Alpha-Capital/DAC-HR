import {
  formatOpenAIApiError,
  openAIKeyFingerprint,
  REALTIME_MODEL,
} from "@workspace/ai-config";
import {
  describeOpenAIKeySources,
  getServerOpenAIApiKey,
} from "./openai-api-key";

export interface OpenAIPingResult {
  keyLast4?: string;
  keySources: ReturnType<typeof describeOpenAIKeySources>;
  clientSecrets: {
    httpStatus: number;
    ok: boolean;
    errorType?: string;
    errorCode?: string;
    errorMessage?: string;
  };
}

export async function pingOpenAIRealtime(): Promise<OpenAIPingResult> {
  const keySources = describeOpenAIKeySources();
  const apiKey = getServerOpenAIApiKey();
  const keyLast4 = openAIKeyFingerprint(apiKey)?.replace("…", "");

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        audio: { output: { voice: "alloy" } },
      },
    }),
  });

  const bodyText = await response.text();
  let errorType: string | undefined;
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  if (!response.ok) {
    const formatted = formatOpenAIApiError(response.status, bodyText);
    errorMessage = formatted;
    try {
      const parsed = JSON.parse(bodyText) as {
        error?: { type?: string; code?: string; message?: string };
      };
      errorType = parsed.error?.type;
      errorCode = parsed.error?.code;
      errorMessage = parsed.error?.message ?? formatted;
    } catch {
      // keep formatted message
    }
  }

  return {
    keyLast4,
    keySources,
    clientSecrets: {
      httpStatus: response.status,
      ok: response.ok,
      errorType,
      errorCode,
      errorMessage: response.ok ? undefined : errorMessage,
    },
  };
}
