/**
 * Test harness: a real SQLite database with the full current schema (all
 * drizzle migrations applied in order), usable in `bun:test` without the
 * Cloudflare Workers runtime. Repositories/queries take a db instance so they
 * can be driven against this in-memory db (see modules/audit for the pattern).
 */
import { Database } from "bun:sqlite";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/bun-sqlite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runSqlBatch(sqlite: Database, sql: string) {
  for (const statement of sql
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean)) {
    sqlite.exec(statement);
  }
}

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");

  const migrationsDir = path.join(__dirname, "drizzle");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const content = readFileSync(path.join(migrationsDir, file), "utf-8");
    runSqlBatch(sqlite, content);
  }

  const db = drizzle(sqlite, { schema }) as BetterSQLite3Database<
    typeof schema
  >;
  return { db, sqlite };
}

export type TestDb = BetterSQLite3Database<typeof schema>;
