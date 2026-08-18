import { test, expect } from "bun:test";
import {
  allRoundsCompleted,
  coerceDeliveryMode,
  currentRoundIndex,
  pickActiveRound,
  pickNextRound,
  toRoundProgress,
  type RoundProgress,
} from "./round-progression";

function progress(
  entries: Array<{ order: number; status: "pending" | "in_progress" | "completed" }>,
): RoundProgress[] {
  return entries.map((e) => toRoundProgress({ roundOrder: e.order, status: e.status }));
}

test("coerceDeliveryMode keeps only voice", () => {
  expect(coerceDeliveryMode("voice")).toBe("voice");
  expect(coerceDeliveryMode("form")).toBe("form");
  expect(coerceDeliveryMode("hybrid")).toBe("form");
  expect(coerceDeliveryMode(undefined)).toBe("form");
  expect(coerceDeliveryMode(null)).toBe("form");
});

test("pickActiveRound returns the in-progress round first", () => {
  const rounds = progress([
    { order: 0, status: "completed" },
    { order: 1, status: "in_progress" },
    { order: 2, status: "pending" },
  ]);
  expect(pickActiveRound(rounds)?.roundOrder).toBe(1);
});

test("pickActiveRound falls back to the first pending round", () => {
  const rounds = progress([
    { order: 0, status: "completed" },
    { order: 1, status: "pending" },
    { order: 2, status: "pending" },
  ]);
  expect(pickActiveRound(rounds)?.roundOrder).toBe(1);
});

test("pickActiveRound returns null when everything is completed", () => {
  const rounds = progress([
    { order: 0, status: "completed" },
    { order: 1, status: "completed" },
  ]);
  expect(pickActiveRound(rounds)).toBeNull();
});

test("pickActiveRound respects round order regardless of input order", () => {
  const rounds = progress([
    { order: 1, status: "pending" },
    { order: 0, status: "pending" },
  ]);
  expect(pickActiveRound(rounds)?.roundOrder).toBe(0);
});

test("pickNextRound finds the pending round after a given order", () => {
  const rounds = progress([
    { order: 0, status: "completed" },
    { order: 1, status: "completed" },
    { order: 2, status: "pending" },
  ]);
  expect(pickNextRound(rounds, 1)?.roundOrder).toBe(2);
});

test("pickNextRound ignores pending rounds before the given order", () => {
  const rounds = progress([
    { order: 0, status: "pending" },
    { order: 1, status: "completed" },
  ]);
  expect(pickNextRound(rounds, 1)).toBeNull();
});

test("currentRoundIndex prefers in-progress over pending", () => {
  const rounds = progress([
    { order: 0, status: "completed" },
    { order: 1, status: "in_progress" },
    { order: 2, status: "pending" },
  ]);
  expect(currentRoundIndex(rounds)).toBe(1);
});

test("currentRoundIndex falls back to the first pending", () => {
  const rounds = progress([
    { order: 0, status: "completed" },
    { order: 1, status: "pending" },
  ]);
  expect(currentRoundIndex(rounds)).toBe(1);
});

test("currentRoundIndex returns the last index when all completed", () => {
  const rounds = progress([
    { order: 0, status: "completed" },
    { order: 1, status: "completed" },
  ]);
  expect(currentRoundIndex(rounds)).toBe(1);
});

test("allRoundsCompleted is true only when every round is completed", () => {
  expect(
    allRoundsCompleted(progress([{ order: 0, status: "completed" }, { order: 1, status: "completed" }])),
  ).toBe(true);
  expect(
    allRoundsCompleted(progress([{ order: 0, status: "completed" }, { order: 1, status: "pending" }])),
  ).toBe(false);
  expect(allRoundsCompleted([])).toBe(false);
});
