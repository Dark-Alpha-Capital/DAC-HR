/**
 * Finalizes interview.round_id schema: backfills round_id and drops
 * position_round_template_id. Safe to run multiple times (no-op when already done).
 * Use --remote for production D1.
 */
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Database } from "bun:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../../../apps/frontend");
const remote = process.argv.includes("--remote");

/**
 * Run SQL via `wrangler d1 execute --file`.
 * Prefer --file over --command: wrangler/yargs often splits SQL with spaces
 * into unknown CLI args (e.g. "Unknown arguments: name, FROM, ...").
 */
function runD1Sql(sql: string): { status: number | null; stdout: string; stderr: string } {
  const target = remote ? "--remote" : "--local";
  const dir = mkdtempSync(path.join(tmpdir(), "d1-sql-"));
  const file = path.join(dir, "query.sql");

  try {
    writeFileSync(file, sql.endsWith(";") ? sql : `${sql};`, "utf-8");
    const result = spawnSync(
      "bunx",
      [
        "wrangler",
        "d1",
        "execute",
        "hr-automation-db",
        target,
        "--file",
        file,
        "--json",
        "--yes",
      ],
      {
        cwd: webDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      },
    );
    return {
      status: result.status,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function executeD1(sql: string) {
  const target = remote ? "--remote" : "--local";
  const result = runD1Sql(sql);

  if (result.status !== 0) {
    console.error(`Failed SQL: ${sql}`);
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`wrangler d1 execute failed (${target})`);
  }
}

function queryD1<T extends Record<string, unknown>>(sql: string): T[] {
  const result = runD1Sql(sql);

  if (result.status !== 0) {
    throw new Error(
      `wrangler d1 query failed: ${result.stderr || result.stdout}`,
    );
  }

  // wrangler may print non-JSON log lines before the JSON payload
  const stdout = result.stdout.trim();
  const jsonStart = stdout.indexOf("[");
  const jsonText = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
  const parsed = JSON.parse(jsonText || "[]") as Array<{
    results: T[];
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
    throw new Error("No local D1 database found.");
  }
  return path.join(d1Dir, files[0]!);
}

function runSqlBatch(sqlite: Database, sql: string) {
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    sqlite.exec(statement);
  }
}

function interviewHasLegacyColumn(
  query: <T extends Record<string, unknown>>(sql: string) => T[],
): boolean {
  const rows = query<{ name: string }>(`PRAGMA table_info(interview);`);
  return rows.some((row) => row.name === "position_round_template_id");
}

function junctionTableExists(
  query: <T extends Record<string, unknown>>(sql: string) => T[],
): boolean {
  const rows = query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='position_round_templates';`,
  );
  return rows.length > 0;
}

function backfillRoundIdsLocal(sqlite: Database) {
  sqlite.exec(`
    UPDATE interview
    SET round_id = (
      SELECT round_template_id
      FROM position_round_templates
      WHERE position_round_templates.id = interview.position_round_template_id
    )
    WHERE round_id IS NULL
      AND position_round_template_id IS NOT NULL;
  `);
}

function backfillRoundIdsRemote() {
  executeD1(`
    UPDATE interview
    SET round_id = (
      SELECT round_template_id
      FROM position_round_templates
      WHERE position_round_templates.id = interview.position_round_template_id
    )
    WHERE round_id IS NULL
      AND position_round_template_id IS NOT NULL;
  `);
}

function runCleanupRemote() {
  const cleanupSql = readFileSync(
    path.join(__dirname, "0011_cleanup_position_rounds.sql"),
    "utf-8",
  );
  const statements = cleanupSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    executeD1(statement);
  }
}

function runCleanupLocal(sqlite: Database) {
  const cleanupSql = readFileSync(
    path.join(__dirname, "0011_cleanup_position_rounds.sql"),
    "utf-8",
  );
  runSqlBatch(sqlite, cleanupSql);
}

function finalizeViaWrangler() {
  if (!interviewHasLegacyColumn(queryD1)) {
    console.log("✅ Interview schema already finalized (remote/local D1)");
    return;
  }

  console.log(
    `⏳ Finalizing interview schema on ${remote ? "remote" : "local"} D1...`,
  );

  if (junctionTableExists(queryD1)) {
    console.log("  Backfilling interview.round_id from position_round_templates...");
    backfillRoundIdsRemote();
  }

  console.log("  Dropping position_round_template_id and rebuilding interview table...");
  runCleanupRemote();
  console.log("✅ Interview schema finalized");
}

function finalizeViaSqlite() {
  const sqlite = new Database(getLocalD1SqlitePath());

  const query = <T extends Record<string, unknown>>(sql: string): T[] =>
    sqlite.prepare(sql).all() as T[];

  if (!interviewHasLegacyColumn(query)) {
    console.log("✅ Interview schema already finalized (local sqlite)");
    sqlite.close();
    return;
  }

  console.log("⏳ Finalizing interview schema on local D1...");

  if (junctionTableExists(query)) {
    console.log("  Backfilling interview.round_id...");
    backfillRoundIdsLocal(sqlite);
  }

  console.log("  Running schema cleanup...");
  runCleanupLocal(sqlite);
  sqlite.close();
  console.log("✅ Interview schema finalized");
}

function main() {
  if (remote) {
    finalizeViaWrangler();
  } else {
    try {
      finalizeViaSqlite();
    } catch {
      finalizeViaWrangler();
    }
  }
}

main();
