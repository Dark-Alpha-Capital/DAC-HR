import { describe, expect, test } from "bun:test";

import { formatDepartment, formatDepartments } from "../utils";

describe("department formatting utilities", () => {
  test("formatDepartment maps known department keys", () => {
    expect(formatDepartment("capital-markets")).toBe("Capital Markets");
    expect(formatDepartment("pipe")).toBe("PIPE");
  });

  test("formatDepartment preserves unknown department keys", () => {
    expect(formatDepartment("compliance")).toBe("compliance");
  });

  test("formatDepartment joins mapped labels for arrays", () => {
    expect(formatDepartment(["deal-team", "operations"])).toBe(
      "Deal Team, Operations",
    );
  });

  test("formatDepartments returns mapped labels as an array", () => {
    expect(formatDepartments(["management", "legal"])).toEqual([
      "Management",
      "Legal",
    ]);
  });
});
