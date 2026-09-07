/**
 * D1 read baseline analyzer (local). Prints, per core table:
 *   1. current row counts,
 *   2. EXPLAIN QUERY PLAN verdicts for the hot query shapes, so you can see
 *      SCAN (full table) vs SEARCH ... USING INDEX before/after index work.
 *
 * Run:   cd packages/db && bun run db:analyze
 * It shells out to `wrangler d1 execute` against the LOCAL dev database
 * (apps/frontend/.wrangler/state), so it needs no Cloudflare auth. To compare
 * a remote production baseline instead, pass `--remote` (requires auth):
 *   bun run db:analyze -- --remote
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.resolve(pkgDir, "../../apps/frontend");
const remote = process.argv.includes("--remote");

const TABLES = [
  "candidate",
  "application",
  "interview",
  "interview_session",
  "candidate_document",
  "document_category_relations",
  "audit_log",
  "position",
  "question_bank",
  "round_template",
  "employee",
  "contract",
];

const statements: Array<{ label: string; sql: string }> = TABLES.map(
  (table) => ({
    label: `row count — ${table}`,
    sql: `SELECT COUNT(*) AS rows FROM ${table};`,
  }),
);

statements.push(
  {
    label: "application status filter (kanban/status lists)",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM application WHERE status = 'ai_screening';`,
  },
  {
    label: "application candidate-latest (kanban window feed)",
    sql: `EXPLAIN QUERY PLAN SELECT candidate_id FROM application WHERE candidate_id = 'x' ORDER BY updated_at DESC, id DESC;`,
  },
  {
    label: "interview by application (N+1 hot path)",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM interview WHERE application_id = 'x';`,
  },
  {
    label: "interview scheduled/upcoming",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM interview WHERE status = 'pending' AND scheduled_at >= 1 ORDER BY scheduled_at;`,
  },
  {
    label: "candidate_document by candidate",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM candidate_document WHERE candidate_id = 'x';`,
  },
  {
    label: "document category relation by document",
    sql: `EXPLAIN QUERY PLAN SELECT category_id FROM document_category_relations WHERE document_id = 'x';`,
  },
  {
    label: "round_template by position",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM round_template WHERE position_id = 'x';`,
  },
  {
    label: "round questions by round",
    sql: `EXPLAIN QUERY PLAN SELECT question_id FROM round_template_questions WHERE round_template_id = 'x';`,
  },
  {
    label: "audit_log by user / date",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM audit_log WHERE user_id = 'x' ORDER BY created_at DESC;
      EXPLAIN QUERY PLAN SELECT id FROM audit_log WHERE created_at >= 1 ORDER BY created_at DESC;`,
  },
  {
    label: "interview_session by application / interview",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM interview_session WHERE application_id = 'x';
      EXPLAIN QUERY PLAN SELECT id FROM interview_session WHERE interview_id = 'x';`,
  },
  {
    label: "contract by position",
    sql: `EXPLAIN QUERY PLAN SELECT id FROM contract WHERE position_id = 'x';`,
  },
);

console.log(
  remote
    ? "Analyzing REMOTE production D1 (read-only queries)."
    : "Analyzing LOCAL dev D1.",
);

let failed = false;
for (const { label, sql } of statements) {
  console.log(`\n===== ${label} =====`);
  const result = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      "hr-automation-db",
      remote ? "--remote" : "--local",
      "--command",
      sql,
    ],
    {
      cwd: webDir,
      stdio: "inherit",
      env: process.env,
    },
  );
  if ((result.status ?? 1) !== 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
