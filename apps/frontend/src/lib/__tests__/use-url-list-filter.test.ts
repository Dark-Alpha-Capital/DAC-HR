import { describe, expect, test } from "bun:test";

import {
  buildMultiSelectParams,
  buildTextSearchParams,
} from "../hooks/use-url-list-filter";

function params(init: string): URLSearchParams {
  return new URLSearchParams(init);
}

describe("buildMultiSelectParams", () => {
  test("replaces the param's values and resets page to 1", () => {
    const next = buildMultiSelectParams(
      params("page=3&status=active&status=hold"),
      "status",
      ["active"],
    );
    expect(next.getAll("status")).toEqual(["active"]);
    expect(next.get("page")).toBeNull();
  });

  test("appends multiple selected values", () => {
    const next = buildMultiSelectParams(params("page=2"), "source", [
      "linkedin",
      "handshake",
    ]);
    expect(next.getAll("source")).toEqual(["linkedin", "handshake"]);
    expect(next.get("page")).toBeNull();
  });

  test("clears the param entirely when nothing is selected", () => {
    const next = buildMultiSelectParams(
      params("type=a&type=b&page=5"),
      "type",
      [],
    );
    expect(next.get("type")).toBeNull();
    expect(next.get("page")).toBeNull();
  });

  test("preserves unrelated params", () => {
    const next = buildMultiSelectParams(params("round=r1&page=4"), "position", [
      "p1",
    ]);
    expect(next.get("round")).toBe("r1");
    expect(next.get("position")).toBe("p1");
    expect(next.get("page")).toBeNull();
  });
});

describe("buildTextSearchParams", () => {
  test("sets the param and resets page", () => {
    const next = buildTextSearchParams(params("page=3"), "name", "  jane  ");
    expect(next.get("name")).toBe("jane");
    expect(next.get("page")).toBeNull();
  });

  test("removes the param when the value is blank", () => {
    const next = buildTextSearchParams(params("name=old&page=2"), "name", "  ");
    expect(next.get("name")).toBeNull();
    expect(next.get("page")).toBeNull();
  });
});
