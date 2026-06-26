export type ServerInterviewTopic =
  | "voice"
  | "validate"
  | "state"
  | "form"
  | "bundle"
  | "ws"
  | "eval"
  | "api";

const TOPIC_EMOJI: Record<ServerInterviewTopic, string> = {
  voice: "🎤",
  validate: "🔑",
  state: "🔄",
  form: "📋",
  bundle: "🔗",
  ws: "🔌",
  eval: "🤖",
  api: "📡",
};

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

function sanitizeServerData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (TRUNCATE_KEYS.has(key) && typeof value === "string") {
      out[key] = truncateId(value);
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
  data: Record<string, unknown> = {},
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
    data: Record<string, unknown> = {},
  ) {
    serverInterviewLog("info", topic, component, action, data);
  },
  warn(
    topic: ServerInterviewTopic,
    component: string,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    serverInterviewLog("warn", topic, component, action, data);
  },
  error(
    topic: ServerInterviewTopic,
    component: string,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    serverInterviewLog("error", topic, component, action, data);
  },
  success(
    topic: ServerInterviewTopic,
    component: string,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    serverInterviewLog("info", topic, component, action, data, { success: true });
  },
};
