import { test, expect } from "bun:test";
import {
  sortCandidateListItems,
  type CandidateListItem,
} from "./candidate-list-sort";

const items: CandidateListItem[] = [
  {
    id: "1",
    firstName: "Alice",
    lastName: "Zulu",
    email: "a@x.com",
    phone: null,
    location: null,
    locationCity: null,
    locationState: null,
    source: null,
    sourceUrl: null,
    note: null,
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-03"),
    position: null,
  },
  {
    id: "2",
    firstName: "Bob",
    lastName: "Adams",
    email: "b@x.com",
    phone: null,
    location: null,
    locationCity: null,
    locationState: null,
    source: null,
    sourceUrl: null,
    note: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-04"),
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
