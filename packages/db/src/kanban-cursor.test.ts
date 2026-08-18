import { test, expect } from "bun:test";
import {
  decodeKanbanCursor,
  encodeKanbanCursor,
} from "./kanban-cursor";

test("kanban cursor round-trips numeric updatedAt from SQLite", () => {
  const cursor = encodeKanbanCursor({
    updatedAt: String(1_718_400_000_000),
    id: "candidate-123",
  });

  expect(decodeKanbanCursor(cursor)).toEqual({
    updatedAt: "1718400000000",
    id: "candidate-123",
  });
});

test("kanban cursor decodes legacy numeric updatedAt payloads", () => {
  const legacyPayload = btoa(
    JSON.stringify({ updatedAt: 1_718_400_000_000, id: "candidate-123" }),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  expect(decodeKanbanCursor(legacyPayload)).toEqual({
    updatedAt: "1718400000000",
    id: "candidate-123",
  });
});
