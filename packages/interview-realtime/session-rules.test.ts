import { test, expect } from "bun:test";
import {
  nextBackoffDelayMs,
  shouldMarkInterrupted,
  VAD_SILENCE_DURATION_MS,
} from "./session-rules";

test("VAD silence is tuned for thinking pauses", () => {
  expect(VAD_SILENCE_DURATION_MS).toBeGreaterThanOrEqual(1500);
});

test("nextBackoffDelayMs grows exponentially and caps", () => {
  expect(nextBackoffDelayMs(0)).toBe(1000);
  expect(nextBackoffDelayMs(1)).toBe(2000);
  expect(nextBackoffDelayMs(2)).toBe(4000);
  expect(nextBackoffDelayMs(10)).toBe(30000);
});

test("shouldMarkInterrupted never interrupts practice or completed sessions", () => {
  expect(shouldMarkInterrupted(1000, "completed", false)).toBe(false);
  expect(shouldMarkInterrupted(1001, "active", true)).toBe(false);
  expect(shouldMarkInterrupted(1011, "active", false)).toBe(true);
  expect(shouldMarkInterrupted(1000, "active", false)).toBe(true);
});
