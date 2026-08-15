import { test, expect } from "bun:test";
import {
  parseClientMessage,
  parseDoMessage,
  sendDoMessage,
  serializeDoMessage,
} from "./events";

test("parseClientMessage accepts valid inbound messages and rejects unknown", () => {
  expect(parseClientMessage(JSON.stringify({ type: "END_INTERVIEW" }))).toEqual(
    { type: "END_INTERVIEW" },
  );
  expect(
    parseClientMessage(
      JSON.stringify({
        type: "CHEATING_EVENT",
        eventType: "TAB_SWITCHED",
      }),
    ),
  ).toEqual({ type: "CHEATING_EVENT", eventType: "TAB_SWITCHED" });
  expect(parseClientMessage(JSON.stringify({ type: "NOPE" }))).toBeNull();
  expect(parseClientMessage("not json")).toBeNull();
});

test("parseDoMessage recognizes known DO messages and narrows fields", () => {
  const connected = parseDoMessage(
    JSON.stringify({
      type: "CONNECTED",
      state: { currentQuestionIndex: 2, voicePhase: "questions" },
    }),
  );
  expect(connected?.type).toBe("CONNECTED");

  const timedOut = parseDoMessage(
    JSON.stringify({ type: "QUESTION_TIMED_OUT", questionId: "q-1" }),
  );
  expect(timedOut?.type).toBe("QUESTION_TIMED_OUT");
  if (timedOut?.type === "QUESTION_TIMED_OUT") {
    expect(timedOut.questionId).toBe("q-1");
  }

  expect(parseDoMessage(JSON.stringify({ type: "UNKNOWN" }))).toBeNull();
  expect(parseDoMessage("garbage")).toBeNull();
});

test("parseDoMessage rejects known types with missing required payload fields", () => {
  // QUESTION_TIMED_OUT requires questionId
  expect(
    parseDoMessage(JSON.stringify({ type: "QUESTION_TIMED_OUT" })),
  ).toBeNull();
  // ANSWER_SAVED requires questionId + transcript
  expect(
    parseDoMessage(JSON.stringify({ type: "ANSWER_SAVED", questionId: "q" })),
  ).toBeNull();
  // TRANSCRIPT requires role + text
  expect(
    parseDoMessage(JSON.stringify({ type: "TRANSCRIPT", role: "user" })),
  ).toBeNull();
});

test("parseDoMessage accepts every message shape the DO emits", () => {
  const payloads = [
    { type: "INTRO_STARTED" },
    {
      type: "QUESTION_CHANGED",
      index: 0,
      questionId: "q-1",
      question: {
        id: "q-1",
        questionText: "Tell me about yourself",
        questionType: "text",
      },
    },
    { type: "ALL_QUESTIONS_ASKED" },
    { type: "TRANSCRIPT", role: "user", text: "hello" },
    { type: "TRANSCRIPT_DELTA", role: "assistant", delta: "hi" },
    { type: "ANSWER_SAVED", questionId: "q-1", transcript: "answer" },
    { type: "INTERVIEW_COMPLETED" },
    { type: "PRACTICE_ENDED" },
    { type: "SESSION_TIME_LIMIT" },
    { type: "QUESTION_TIMED_OUT", questionId: "q-1" },
    { type: "ERROR", message: "boom" },
    { type: "PONG" },
  ];
  for (const payload of payloads) {
    expect(parseDoMessage(JSON.stringify(payload))).not.toBeNull();
  }
});

test("sendDoMessage writes a serialized typed payload", () => {
  let sent = "";
  const ws = {
    readyState: 1,
    send: (data: string) => {
      sent = data;
    },
  } as unknown as WebSocket;

  sendDoMessage(ws, { type: "PING" });
  expect(sent).toBe(JSON.stringify({ type: "PING" }));
});

test("serializeDoMessage stringifies", () => {
  expect(serializeDoMessage({ type: "PONG" })).toBe('{"type":"PONG"}');
});
