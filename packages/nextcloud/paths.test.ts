import { expect, test } from "bun:test";
import {
  buildNamedEntityFolderPath,
  formatPersonName,
  sanitizePathSegment,
} from "./paths";

test("sanitizePathSegment normalizes spaces and unsafe characters", () => {
  expect(sanitizePathSegment("Jane Doe")).toBe("Jane-Doe");
  expect(sanitizePathSegment("  O'Brien, Pat  ")).toBe("O-Brien-Pat");
});

test("buildNamedEntityFolderPath uses name and id when name is present", () => {
  expect(
    buildNamedEntityFolderPath({
      root: "/ATS/candidates",
      name: "Jane Doe",
      id: "cand_123",
    }),
  ).toBe("/ATS/candidates/Jane-Doe/cand_123");
});

test("buildNamedEntityFolderPath falls back to id-only folder", () => {
  expect(
    buildNamedEntityFolderPath({
      root: "/ATS/interviews",
      name: "",
      id: "sess_456",
    }),
  ).toBe("/ATS/interviews/sess_456");
});

test("formatPersonName joins first and last name", () => {
  expect(formatPersonName("Jane", "Doe")).toBe("Jane Doe");
  expect(formatPersonName("Jane", null)).toBe("Jane");
});
