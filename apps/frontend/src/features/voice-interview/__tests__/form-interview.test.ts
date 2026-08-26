import { describe, expect, test } from "bun:test";

import {
  FIRST_FORM_QUESTION_INDEX,
  formatUnansweredQuestionLabel,
  hasFormAnswer,
  hasStoredFormResponse,
  sortQuestionsByOrder,
  unansweredFormQuestionIndexes,
  unansweredStoredFormQuestionIndexes,
} from "../form-interview";

describe("form interview start", () => {
  test("form rounds always start at the first question", () => {
    expect(FIRST_FORM_QUESTION_INDEX).toBe(0);
  });
});

describe("hasFormAnswer", () => {
  test("empty or whitespace text is unanswered", () => {
    expect(hasFormAnswer(undefined)).toBe(false);
    expect(hasFormAnswer({ type: "text", text: "" })).toBe(false);
    expect(hasFormAnswer({ type: "text", text: "   " })).toBe(false);
  });

  test("typed text and selected MCQ count as answered", () => {
    expect(hasFormAnswer({ type: "text", text: "I would use RAG." })).toBe(true);
    expect(
      hasFormAnswer({ type: "mcq", selectedOptionId: "opt-1" }),
    ).toBe(true);
    expect(hasFormAnswer({ type: "mcq", selectedOptionId: "" })).toBe(false);
  });
});

describe("unansweredFormQuestionIndexes", () => {
  const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }];

  test("blocks complete when any question is blank", () => {
    expect(
      unansweredFormQuestionIndexes(questions, {
        q2: { type: "text", text: "answered" },
      }),
    ).toEqual([0, 2]);
  });

  test("allows complete only when every question has an answer", () => {
    expect(
      unansweredFormQuestionIndexes(questions, {
        q1: { type: "text", text: "one" },
        q2: { type: "mcq", selectedOptionId: "a" },
        q3: { type: "text", text: "three" },
      }),
    ).toEqual([]);
  });
});

describe("stored form responses", () => {
  test("blank stored rows do not count as answers", () => {
    expect(hasStoredFormResponse({})).toBe(false);
    expect(hasStoredFormResponse({ answerText: "  " })).toBe(false);
    expect(hasStoredFormResponse({ answerText: "done" })).toBe(true);
    expect(hasStoredFormResponse({ selectedOptionId: "opt" })).toBe(true);
  });

  test("finds questions with no stored response", () => {
    expect(
      unansweredStoredFormQuestionIndexes(
        [{ id: "q1" }, { id: "q2" }],
        [{ questionId: "q1", answerText: "yes" }],
      ),
    ).toEqual([1]);
  });
});

describe("sortQuestionsByOrder", () => {
  test("keeps questions in order_index order so round 1 starts at question 1", () => {
    const sorted = sortQuestionsByOrder([
      { id: "second", orderIndex: 2 },
      { id: "first", orderIndex: 1 },
      { id: "third", orderIndex: 3 },
    ]);
    expect(sorted.map((q) => q.id)).toEqual(["first", "second", "third"]);
    expect(sorted[FIRST_FORM_QUESTION_INDEX]?.id).toBe("first");
  });
});

describe("formatUnansweredQuestionLabel", () => {
  test("names the blank questions for the candidate", () => {
    expect(formatUnansweredQuestionLabel([0])).toBe("question 1");
    expect(formatUnansweredQuestionLabel([0, 2])).toBe("questions 1 and 3");
    expect(formatUnansweredQuestionLabel([0, 1, 4])).toBe(
      "questions 1, 2, and 5",
    );
  });
});
