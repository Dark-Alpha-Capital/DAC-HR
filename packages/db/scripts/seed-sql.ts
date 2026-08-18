import type { Database } from "bun:sqlite";
import { formatSqlValue } from "./sql-value";

const SEED_TABLES_IN_INSERT_ORDER = [
  "user",
  "position",
  "round_template",
  "question_bank",
  "round_template_questions",
  "candidate",
  "application",
  "candidate_position",
  "interview",
  "interview_session",
  "interview_response",
] as const;

export const CLEAR_SEED_SQL = `
PRAGMA foreign_keys = OFF;
DELETE FROM interview_response;
DELETE FROM interview_evaluation;
DELETE FROM interview_session;
DELETE FROM interview_ai_analysis;
DELETE FROM interview_feedback;
DELETE FROM interview;
DELETE FROM candidate_ai_screening;
DELETE FROM candidate_onboarding;
DELETE FROM candidate_document;
DELETE FROM application;
DELETE FROM candidate_position;
DELETE FROM candidate;
DELETE FROM round_template_questions;
DELETE FROM question_bank;
DELETE FROM round_template;
DELETE FROM position;
DELETE FROM user WHERE id = '00000000-0000-4000-8000-000000000001';
PRAGMA foreign_keys = ON;
`;

function exportTable(sqlite: Database, table: string, where?: string): string {
  // SAFETY: PRAGMA table_info returns one row per column with a `name` field.
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;

  if (columns.length === 0) return "";

  const colNames = columns.map((c) => c.name);
  // SAFETY: bun:sqlite `.all()` returns row objects whose column values are
  // the SQLite storage types (string | number | bigint | null | Uint8Array).
  const rows = sqlite
    .prepare(
      `SELECT ${colNames.join(", ")} FROM ${table}${where ? ` WHERE ${where}` : ""}`,
    )
    .all() as Array<
    Record<string, string | number | bigint | null | Uint8Array>
  >;

  if (rows.length === 0) return "";

  return rows
    .map((row) => {
      const values = colNames.map((col) => formatSqlValue(row[col])).join(", ");
      return `INSERT INTO ${table} (${colNames.join(", ")}) VALUES (${values});`;
    })
    .join("\n");
}

export function exportSeedDataSql(sqlite: Database): string {
  const chunks = [
    "PRAGMA foreign_keys = OFF;",
    exportTable(sqlite, "user", "id = '00000000-0000-4000-8000-000000000001'"),
    exportTable(sqlite, "position"),
    exportTable(sqlite, "round_template"),
    exportTable(sqlite, "question_bank"),
    exportTable(sqlite, "round_template_questions"),
    exportTable(sqlite, "candidate"),
    exportTable(sqlite, "application"),
    exportTable(sqlite, "candidate_position"),
    exportTable(sqlite, "interview"),
    exportTable(sqlite, "interview_session"),
    exportTable(sqlite, "interview_response"),
    "PRAGMA foreign_keys = ON;",
  ].filter(Boolean);

  const exportedTables = SEED_TABLES_IN_INSERT_ORDER.filter((table) => {
    // SAFETY: COUNT(*) returns a single row with a numeric `count` column.
    const count = sqlite
      .prepare(`SELECT COUNT(*) as count FROM ${table}`)
      .get() as { count: number };
    return count.count > 0;
  });

  if (exportedTables.length === 0) {
    throw new Error("No seed data found in local D1 to export");
  }

  return chunks.join("\n");
}
