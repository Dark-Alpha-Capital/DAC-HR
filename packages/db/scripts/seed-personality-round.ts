import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createInitialPersonalityScreeningQuestions,
  INITIAL_PERSONALITY_SCREENING_ROUND,
} from "../src/personality-screening";
import { formatSqlValue } from "./sql-value";

type PositionRow = {
  id: string;
  name: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../../../apps/frontend");
const remote = process.argv.includes("--remote");

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

  const parsed = JSON.parse(result.stdout) as Array<{
    results: T[];
    success: boolean;
  }>;
  return parsed[0]?.results ?? [];
}

function runWranglerD1(filePath: string) {
  const target = remote ? "--remote" : "--local";
  const result = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "execute",
      "hr-automation-db",
      target,
      "--file",
      filePath,
      "--yes",
    ],
    { cwd: webDir, stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute failed (${target})`);
  }
}

function getPositionsMissingRound(): PositionRow[] {
  return queryD1<PositionRow>(
    `SELECT p.id, p.name
     FROM position p
     WHERE NOT EXISTS (
       SELECT 1
       FROM round_template rt
       WHERE rt.position_id = p.id
         AND rt.name = ${formatSqlValue(INITIAL_PERSONALITY_SCREENING_ROUND.name)}
     )
     ORDER BY p.name;`,
  );
}

function buildSeedSql(positions: PositionRow[]): string {
  const statements = ["PRAGMA foreign_keys = ON;"];

  for (const position of positions) {
    const roundId = crypto.randomUUID();
    const now = Date.now();
    const questions = createInitialPersonalityScreeningQuestions();

    statements.push(
      `INSERT INTO round_template (id, position_id, name, description, created_at, updated_at) VALUES (${formatSqlValue(roundId)}, ${formatSqlValue(position.id)}, ${formatSqlValue(INITIAL_PERSONALITY_SCREENING_ROUND.name)}, ${formatSqlValue(INITIAL_PERSONALITY_SCREENING_ROUND.description)}, ${now}, ${now});`,
    );

    for (const question of questions) {
      statements.push(
        `INSERT INTO question_bank (id, question_text, question_type, question_category, options, time_limit_seconds, order_index, is_active, created_at, updated_at) VALUES (${formatSqlValue(question.id)}, ${formatSqlValue(question.questionText)}, ${formatSqlValue(question.questionType)}, ${formatSqlValue(question.category)}, ${formatSqlValue(JSON.stringify(question.options))}, ${question.timeLimitSeconds}, ${question.orderIndex}, 1, ${now}, ${now});`,
      );

      statements.push(
        `INSERT INTO round_template_questions (id, round_template_id, question_id) VALUES (${formatSqlValue(crypto.randomUUID())}, ${formatSqlValue(roundId)}, ${formatSqlValue(question.id)});`,
      );
    }
  }

  return statements.join("\n");
}

function applySeed(positions: PositionRow[]) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "hr-automation-personality-"));
  const dataPath = path.join(tempDir, "personality-round.sql");

  try {
    writeFileSync(dataPath, buildSeedSql(positions));
    runWranglerD1(dataPath);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  console.log(
    remote
      ? "☁️  Seeding Initial Personality Screening on remote D1..."
      : "🔄 Seeding Initial Personality Screening on local D1...",
  );

  const positions = getPositionsMissingRound();
  if (positions.length === 0) {
    console.log(
      `All positions already have "${INITIAL_PERSONALITY_SCREENING_ROUND.name}". Nothing to do.`,
    );
    return;
  }

  applySeed(positions);
  console.log(
    `✅ Added "${INITIAL_PERSONALITY_SCREENING_ROUND.name}" for ${positions.length} positions`,
  );
  for (const position of positions) {
    console.log(`   • ${position.name}`);
  }
}

main();
