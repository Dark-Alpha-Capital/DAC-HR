import { expect, test } from "bun:test";
import {
  mergeAnswerUtterances,
  MAX_ANSWER_FOLLOW_UPS,
} from "./answer-evaluation";

test("mergeAnswerUtterances joins non-empty utterances", () => {
  expect(mergeAnswerUtterances(["  hello ", "", "world  "])).toBe("hello world");
});

test("MAX_ANSWER_FOLLOW_UPS is at least 2", () => {
  expect(MAX_ANSWER_FOLLOW_UPS).toBeGreaterThanOrEqual(2);
});
