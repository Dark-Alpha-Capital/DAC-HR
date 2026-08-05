import { test, expect } from "bun:test";
import {
  matchMcqOption,
  detectQuestionIndexFromTranscript,
  buildCheatingSummary,
} from "./session-logic";
import type { InterviewQuestion } from "./types";

const mcq: InterviewQuestion = {
  id: "q1",
  questionText: "What is the capital of France?",
  questionType: "mcq",
  category: "screening",
  options: [
    { id: "a", text: "Paris" },
    { id: "b", text: "London" },
    { id: "c", text: "Berlin" },
  ],
};

test("matchMcqOption matches option letter and text", () => {
  expect(matchMcqOption(mcq, "option a")).toBe("a");
  expect(matchMcqOption(mcq, "Paris")).toBe("a");
  expect(matchMcqOption(mcq, "I think it is b")).toBeNull();
});

test("matchMcqOption returns null for non-mcq questions", () => {
  expect(
    matchMcqOption({ ...mcq, questionType: "text" }, "option a"),
  ).toBeNull();
});

test("detectQuestionIndexFromTranscript finds the active question", () => {
  const questions = [
    mcq,
    { ...mcq, id: "q2", questionText: "Tell me about your background." },
  ];
  expect(
    detectQuestionIndexFromTranscript(
      questions,
      "What is the capital of France?",
    ),
  ).toBe(0);
  expect(
    detectQuestionIndexFromTranscript(
      questions,
      "Tell me about your background.",
    ),
  ).toBe(1);
});

test("buildCheatingSummary maps counters to the summary shape", () => {
  expect(
    buildCheatingSummary({
      TAB_SWITCHED: 3,
      focusLostSeconds: 12,
      COPY_ATTEMPT: 1,
    }),
  ).toEqual({
    tabSwitches: 3,
    focusLostSeconds: 12,
    fullscreenExits: 0,
    copyAttempts: 1,
    pasteAttempts: 0,
  });
});
