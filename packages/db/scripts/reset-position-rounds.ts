/**
 * Wipes all rounds (and dependent interview data) and creates Screening + Technical
 * rounds for every position. Use --remote for production D1.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
  DEFAULT_SCREENING_ROUND,
  DEFAULT_TECHNICAL_ROUND,
} from "../default-rounds";
import { position } from "../schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../../../apps/frontend");
const remote = process.argv.includes("--remote");

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function executeD1(sql: string) {
  const target = remote ? "--remote" : "--local";
  const result = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      "hr-automation-db",
      target,
      "--command",
      sql,
      "--json",
    ],
    { cwd: webDir, encoding: "utf-8" },
  );

  if (result.status !== 0) {
    console.error(`Failed SQL: ${sql}`);
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`wrangler d1 execute failed (${target})`);
  }

  // SAFETY: `wrangler d1 execute --json` emits an array of result objects,
  // each carrying a `success` boolean flag.
  const parsed = JSON.parse(result.stdout || "[]") as Array<{
    success: boolean;
  }>;
  if (parsed[0] && parsed[0].success === false) {
    throw new Error(`wrangler d1 execute returned failure for: ${sql}`);
  }
}

function runStatements(statements: string[]) {
  for (const statement of statements) {
    executeD1(statement);
  }
}

function queryD1<T extends object>(sql: string): T[] {
  const target = remote ? "--remote" : "--local";
  const result = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      "hr-automation-db",
      target,
      "--command",
      sql,
      "--json",
    ],
    { cwd: webDir, encoding: "utf-8" },
  );

  if (result.status !== 0) {
    throw new Error(
      `wrangler d1 query failed: ${result.stderr || result.stdout}`,
    );
  }

  // SAFETY: `wrangler d1 execute --json` emits an array of result objects,
  // each carrying `results` and `success` fields; we read the first result set.
  const parsed = JSON.parse(result.stdout) as Array<{
    results: T[];
    success: boolean;
  }>;
  return parsed[0]?.results ?? [];
}

function getLocalD1SqlitePath(): string {
  const d1Dir = path.join(
    webDir,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  const files = readdirSync(d1Dir).filter(
    (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
  );
  if (files.length === 0) {
    throw new Error("No local D1 database found. Run bun run db:migrate first.");
  }
  return path.join(d1Dir, files[0]!);
}

function tableExists(tableName: string): boolean {
  const rows = queryD1<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=${sqlValue(tableName)};`,
  );
  return rows.length > 0;
}

function buildResetSql(
  positions: Array<{ id: string; name: string }>,
  options?: { hasPositionRoundTemplates?: boolean },
): string[] {
  const now = Date.now();
  const statements: string[] = [
    "PRAGMA foreign_keys = OFF",
    "DELETE FROM interview_response",
    "DELETE FROM interview_evaluation",
    "DELETE FROM cheating_event",
    "DELETE FROM interview_session",
    "DELETE FROM interview_feedback",
    "DELETE FROM interview_ai_analysis",
    "DELETE FROM interview",
    "DELETE FROM round_template_questions",
    "DELETE FROM question_bank",
  ];

  if (options?.hasPositionRoundTemplates) {
    statements.push("DELETE FROM position_round_templates");
  }

  statements.push("DELETE FROM round_template");

  const insertValues: string[] = [];
  for (const pos of positions) {
    const screeningId = crypto.randomUUID();
    const technicalId = crypto.randomUUID();
    insertValues.push(
      `(${sqlValue(screeningId)}, ${sqlValue(pos.id)}, ${sqlValue(DEFAULT_SCREENING_ROUND.name)}, ${sqlValue(DEFAULT_SCREENING_ROUND.description)}, ${now}, ${now})`,
      `(${sqlValue(technicalId)}, ${sqlValue(pos.id)}, ${sqlValue(DEFAULT_TECHNICAL_ROUND.name)}, ${sqlValue(DEFAULT_TECHNICAL_ROUND.description)}, ${now}, ${now})`,
    );
  }

  if (insertValues.length > 0) {
    statements.push(
      `INSERT INTO round_template (id, position_id, name, description, created_at, updated_at) VALUES ${insertValues.join(", ")}`,
    );
  }

  statements.push("PRAGMA foreign_keys = ON");
  return statements;
}

async function resetRoundsLocal() {
  const sqlite = new Database(getLocalD1SqlitePath());
  const db = drizzle(sqlite);
  const positions = await db
    .select({ id: position.id, name: position.name })
    .from(position);

  if (positions.length === 0) {
    console.log("No positions found — nothing to do.");
    sqlite.close();
    return;
  }

  const hasJunction = tableExists("position_round_templates");
  const statements = buildResetSql(positions, {
    hasPositionRoundTemplates: hasJunction,
  });

  runStatements(statements);
  sqlite.close();
  console.log(
    `✅ Reset rounds for ${positions.length} positions (${positions.length * 2} rounds created)`,
  );
}

async function resetRoundsRemote() {
  const positions = queryD1<{ id: string; name: string }>(
    "SELECT id, name FROM position ORDER BY name;",
  );

  if (positions.length === 0) {
    console.log("No positions found on remote D1 — nothing to do.");
    return;
  }

  const hasJunction = tableExists("position_round_templates");
  const statements = buildResetSql(positions, {
    hasPositionRoundTemplates: hasJunction,
  });

  runStatements(statements);
  console.log(
    `✅ Remote: reset rounds for ${positions.length} positions (${positions.length * 2} rounds created)`,
  );
  for (const pos of positions) {
    console.log(`   • ${pos.name}`);
  }
}

async function main() {
  console.log(
    remote
      ? "☁️  Resetting rounds on remote D1..."
      : "🔄 Resetting rounds on local D1...",
  );

  if (remote) {
    await resetRoundsRemote();
  } else {
    await resetRoundsLocal();
  }
}

main().catch((error) => {
  console.error("❌ Reset rounds failed:", error);
  process.exit(1);
});
