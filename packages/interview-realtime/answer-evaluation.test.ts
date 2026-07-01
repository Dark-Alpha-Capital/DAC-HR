import { expect, test } from "bun:test";
import {
  looksLikeNoise,
  mergeAnswerUtterances,
  MAX_ANSWER_FOLLOW_UPS,
} from "./answer-evaluation";

test("mergeAnswerUtterances joins non-empty utterances", () => {
  expect(mergeAnswerUtterances(["  hello ", "", "world  "])).toBe("hello world");
});

test("looksLikeNoise detects filler and empty utterances", () => {
  expect(looksLikeNoise("")).toBe(true);
  expect(looksLikeNoise("um")).toBe(true);
  expect(looksLikeNoise("[inaudible]")).toBe(true);
  expect(looksLikeNoise("Peace")).toBe(true);
  expect(looksLikeNoise("Yes")).toBe(false);
  expect(looksLikeNoise("A")).toBe(false);
  expect(looksLikeNoise("Yes, I am ready to begin")).toBe(false);
  expect(looksLikeNoise("Hi, can we begin?")).toBe(false);
});
