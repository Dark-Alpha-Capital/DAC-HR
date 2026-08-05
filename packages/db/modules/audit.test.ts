import { test, expect } from "bun:test";
import { createTestDb } from "../testing";
import type { Database } from "@workspace/db/db";
import { insertAuditLog, listAuditLogs } from "./audit";
import { user } from "../schema";

function seedUser(db: Database, id: string) {
  return db.insert(user).values({
    id,
    name: "Test User",
    email: "test@darkalphacapital.com",
    emailVerified: true,
  });
}

test("insertAuditLog writes a row and returns it", async () => {
  const { db } = createTestDb();
  const testDb = db as unknown as Database;

  await seedUser(testDb, "user-1");

  const entry = await insertAuditLog(
    {
      userId: "user-1",
      action: "save_attendance",
      entityType: "attendance",
      entityId: "2026-08-05",
      details: { count: 3 },
    },
    testDb,
  );

  expect(entry).not.toBeNull();
  expect(entry!.userId).toBe("user-1");
  expect(entry!.action).toBe("save_attendance");

  const { logs, total } = await listAuditLogs({}, testDb);
  expect(total).toBe(1);
  expect(logs[0]!.details).toEqual({ count: 3 });
  expect(logs[0]!.userEmail).toBe("test@darkalphacapital.com");
});

test("listAuditLogs filters by action and paginates", async () => {
  const { db } = createTestDb();
  const testDb = db as unknown as Database;

  await seedUser(testDb, "user-1");

  await insertAuditLog(
    { userId: "user-1", action: "create_candidate", entityType: "candidate", entityId: "c-1", details: {} },
    testDb,
  );
  await insertAuditLog(
    { userId: "user-1", action: "delete_candidate", entityType: "candidate", entityId: "c-2", details: {} },
    testDb,
  );

  const filtered = await listAuditLogs({ action: "delete" }, testDb);
  expect(filtered.total).toBe(1);
  expect(filtered.logs[0]!.action).toBe("delete_candidate");

  const paged = await listAuditLogs({ page: 1, limit: 1 }, testDb);
  expect(paged.logs).toHaveLength(1);
  expect(paged.total).toBe(2);
});
