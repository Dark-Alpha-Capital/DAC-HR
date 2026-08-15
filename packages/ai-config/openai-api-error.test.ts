import { describe, expect, test } from "bun:test";

import {
  formatOpenAIApiError,
  formatRealtimeCallsError,
  parseOpenAIError,
} from "./openai-api-error";

describe("parseOpenAIError", () => {
  test("parses nested error payload into structured fields", () => {
    const parsed = parseOpenAIError(
      401,
      JSON.stringify({
        error: {
          message: "Incorrect API key",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      }),
    );
    expect(parsed.type).toBe("invalid_request_error");
    expect(parsed.code).toBe("invalid_api_key");
    expect(parsed.message).toBe("Incorrect API key");
    expect(parsed.formatted).toContain("HTTP 401");
    expect(parsed.formatted).toContain("type=invalid_request_error");
    expect(parsed.formatted).toContain("code=invalid_api_key");
  });

  test("falls back to a top-level message", () => {
    const parsed = parseOpenAIError(400, JSON.stringify({ message: "bad" }));
    expect(parsed.message).toBe("bad");
    expect(parsed.formatted).toBe("HTTP 400 · bad");
  });

  test("treats a plain-text body as a truncated message", () => {
    const parsed = parseOpenAIError(500, "oops something broke");
    expect(parsed.message).toBeUndefined();
    expect(parsed.formatted).toBe("HTTP 500 · oops something broke");
  });

  test("handles an empty body", () => {
    expect(parseOpenAIError(429, "  ").formatted).toBe(
      "OpenAI request failed (HTTP 429)",
    );
  });
});

describe("formatRealtimeCallsError", () => {
  test("appends quota help only for insufficient_quota", () => {
    const quota = formatRealtimeCallsError(
      429,
      JSON.stringify({
        error: { code: "insufficient_quota", message: "Quota exceeded" },
      }),
    );
    expect(quota).toContain("insufficient_quota");
    expect(quota).toContain("Realtime WebRTC calls bill separately");

    const other = formatRealtimeCallsError(
      400,
      JSON.stringify({ error: { message: "boom" } }),
    );
    expect(other).toContain("HTTP 400 · boom");
    expect(other).not.toContain("Realtime WebRTC");
  });
});

test("formatOpenAIApiError returns the same string as parseOpenAIError", () => {
  const body = JSON.stringify({ error: { message: "x", code: "c" } });
  expect(formatOpenAIApiError(403, body)).toBe(
    parseOpenAIError(403, body).formatted,
  );
});
