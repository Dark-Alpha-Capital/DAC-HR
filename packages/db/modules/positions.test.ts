import { test, expect } from "bun:test";
import { seededShuffle, hashString } from "../seeded-shuffle";
import {
  sortCandidateListItems,
  type CandidateListItem,
} from "../candidate-list-sort";

test("seededShuffle is deterministic for the same seed", () => {
  const input = ["a", "b", "c", "d", "e"];
  expect(seededShuffle(input, 42)).toEqual(seededShuffle(input, 42));
});

test("seededShuffle differs across seeds", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  expect(seededShuffle(input, 1)).not.toEqual(seededShuffle(input, 2));
});

test("hashString is stable and non-negative", () => {
  expect(hashString("round-abc")).toBe(hashString("round-abc"));
  expect(hashString("anything")).toBeGreaterThanOrEqual(0);
});

const items: CandidateListItem[] = [
  {
    id: "1", firstName: "Alice", lastName: "Zulu", email: "a@x.com",
    phone: null, location: null, source: null, sourceUrl: null, note: null,
    createdAt: new Date("2026-01-02"), updatedAt: new Date("2026-01-03"),
    position: null,
  },
  {
    id: "2", firstName: "Bob", lastName: "Adams", email: "b@x.com",
    phone: null, location: null, source: null, sourceUrl: null, note: null,
    createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-04"),
    position: null,
  },
];

test("sortCandidateListItems newest sorts by createdAt desc", () => {
  const sorted = sortCandidateListItems(items, "newest");
  expect(sorted.map((i) => i.id)).toEqual(["1", "2"]);
});

test("sortCandidateListItems name_asc sorts by last name", () => {
  const sorted = sortCandidateListItems(items, "name_asc");
  expect(sorted.map((i) => i.lastName)).toEqual(["Adams", "Zulu"]);
});
