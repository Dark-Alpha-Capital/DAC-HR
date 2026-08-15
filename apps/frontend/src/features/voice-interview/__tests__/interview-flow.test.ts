import { describe, expect, test } from "bun:test";

import {
  isIntroPhase,
  isQuestionPhase,
  toSessionMode,
} from "../interview-flow";

describe("voice interview phase predicates", () => {
  test("isIntroPhase covers welcome phases only", () => {
    expect(isIntroPhase("intro")).toBe(true);
    expect(isIntroPhase("awaiting_ready")).toBe(true);
    expect(isIntroPhase("questions")).toBe(false);
    expect(isIntroPhase("closing")).toBe(false);
    expect(isIntroPhase("awaiting_end")).toBe(false);
  });

  test("isQuestionPhase covers question/winding-down phases only", () => {
    expect(isQuestionPhase("questions")).toBe(true);
    expect(isQuestionPhase("closing")).toBe(true);
    expect(isQuestionPhase("awaiting_end")).toBe(true);
    expect(isQuestionPhase("intro")).toBe(false);
    expect(isQuestionPhase("awaiting_ready")).toBe(false);
  });

  test("phases are mutually exclusive", () => {
    for (const phase of [
      "intro",
      "awaiting_ready",
      "questions",
      "closing",
      "awaiting_end",
    ] as const) {
      expect(isIntroPhase(phase) && isQuestionPhase(phase)).toBe(false);
    }
  });
});

describe("toSessionMode", () => {
  test("voice delivery maps to voice, everything else to form", () => {
    expect(toSessionMode("voice")).toBe("voice");
    expect(toSessionMode("form")).toBe("form");
    expect(toSessionMode("hybrid")).toBe("form");
    expect(toSessionMode(undefined)).toBe("form");
  });
});
