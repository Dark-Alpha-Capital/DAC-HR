import type { JsonObject } from "./types";

export type ServerInterviewTopic =
  | "voice"
  | "validate"
  | "state"
  | "form"
  | "bundle"
  | "ws"
  | "eval"
  | "api";

const TOPIC_EMOJI = {
  voice: "🎤",
  validate: "🔑",
  state: "🔄",
  form: "📋",
  bundle: "🔗",
  ws: "🔌",
  eval: "🤖",
  api: "📡",
} satisfies Record<ServerInterviewTopic, string>;

const TRUNCATE_KEYS = new Set([
  "token",
  "bundleToken",
  "clientSecret",
  "sessionId",
  "bundleId",
  "questionId",
  "roundId",
  "callId",
]);

export function truncateId(
  value: string | undefined | null,
  len = 8,
): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  return value.length <= len ? value : value.slice(0, len);
}

function sanitizeServerData(data: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (TRUNCATE_KEYS.has(key) && String(value) === value) {
      // SAFETY: a value that round-trips through String() is a string
      // primitive, so truncateId's string slicing is safe.
      out[key] = truncateId(value as string);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function serverInterviewLog(
  level: "info" | "warn" | "error",
  topic: ServerInterviewTopic,
  component: string,
  action: string,
  data: JsonObject = {},
  options?: { success?: boolean },
) {
  const emoji =
    level === "error"
      ? "❌"
      : level === "warn"
        ? "⚠️"
        : options?.success
          ? "✅"
          : TOPIC_EMOJI[topic];
  const payload = {
    level,
    msg: `${emoji} [interview:${topic}] ${action}`,
    topic: `interview-${topic}`,
    component,
    action,
    ...sanitizeServerData(data),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const interviewServerLog = {
  info(
    topic: ServerInterviewTopic,
    component: string,
    action: string,
    data: JsonObject = {},
  ) {
    serverInterviewLog("info", topic, component, action, data);
  },
  warn(
    topic: ServerInterviewTopic,
    component: string,
    action: string,
    data: JsonObject = {},
  ) {
    serverInterviewLog("warn", topic, component, action, data);
  },
  error(
    topic: ServerInterviewTopic,
    component: string,
    action: string,
    data: JsonObject = {},
  ) {
    serverInterviewLog("error", topic, component, action, data);
  },
  success(
    topic: ServerInterviewTopic,
    component: string,
    action: string,
    data: JsonObject = {},
  ) {
    serverInterviewLog("info", topic, component, action, data, { success: true });
  },
};
