import { z } from "zod";

export type InterviewLogTopic =
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
} satisfies Record<InterviewLogTopic, string>;

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

function sanitizeData(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    const stringValue = z.string().safeParse(value);
    if (TRUNCATE_KEYS.has(key) && stringValue.success) {
      out[key] = truncateId(stringValue.data);
    } else if (key === "wsUrl" && stringValue.success) {
      try {
        const url = new URL(stringValue.data);
        const tokenParam = url.searchParams.get("token");
        if (tokenParam) {
          url.searchParams.set("token", truncateId(tokenParam) ?? "");
        }
        out[key] = url.toString();
      } catch {
        out[key] = value;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

type LogLevel = "info" | "warn" | "error";

function interviewLog(
  level: LogLevel,
  topic: InterviewLogTopic,
  action: string,
  data: Record<string, unknown> = {},
  emojiOverride?: string,
) {
  const emoji =
    emojiOverride ??
    (level === "error" ? "❌" : level === "warn" ? "⚠️" : TOPIC_EMOJI[topic]);
  const prefix = `${emoji} [interview:${topic}] ${action}`;
  const safe = sanitizeData(data);
  if (level === "error") {
    console.error(prefix, safe);
  } else if (level === "warn") {
    console.warn(prefix, safe);
  } else {
    console.info(prefix, safe);
  }
}

export const logInterview = {
  info(
    topic: InterviewLogTopic,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    interviewLog("info", topic, action, data);
  },
  warn(
    topic: InterviewLogTopic,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    interviewLog("warn", topic, action, data);
  },
  error(
    topic: InterviewLogTopic,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    interviewLog("error", topic, action, data);
  },
  success(
    topic: InterviewLogTopic,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    interviewLog("info", topic, action, data, "✅");
  },
};
