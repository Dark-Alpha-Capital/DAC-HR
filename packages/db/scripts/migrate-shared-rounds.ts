/**
 * Data migration: deduplicate shared round templates so each position owns its rounds.
 * Run after 0011_position_owned_rounds.sql (adds nullable position_id / round_id columns).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
  application,
  interviewSession,
  roundTemplate,
  roundTemplateQuestions,
} from "../schema";

type PositionRoundTemplateRow = {
  id: string;
  position_id: string;
  round_template_id: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../../../apps/frontend");
const remote = process.argv.includes("--remote");

function getLocalD1SqlitePath(): string {
  const d1Dir = path.join(
    webDir,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  const files = readdirSync(d1Dir).filter(
    (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
  );
  if (files.length === 0) {
    throw new Error(
      "No local D1 database found. Run `wrangler d1 migrations apply hr-automation-db --local` once first.",
    );
  }
  return path.join(d1Dir, files[0]!);
}

function runSqlBatch(sqlite: Database, sql: string) {
  for (const statement of sql
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean)) {
    sqlite.exec(statement);
  }
}

async function duplicateRound(
  db: ReturnType<typeof drizzle>,
  sourceRoundId: string,
  positionId: string,
) {
  const [source] = await db
    .select()
    .from(roundTemplate)
    .where(eq(roundTemplate.id, sourceRoundId))
    .limit(1);

  if (!source) {
    throw new Error(`Round ${sourceRoundId} not found`);
  }

  const newRoundId = crypto.randomUUID();
  await db.insert(roundTemplate).values({
    id: newRoundId,
    positionId,
    name: source.name,
    description: source.description,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  });

  const questionLinks = await db
    .select()
    .from(roundTemplateQuestions)
    .where(eq(roundTemplateQuestions.roundTemplateId, sourceRoundId));

  if (questionLinks.length > 0) {
    await db.insert(roundTemplateQuestions).values(
      questionLinks.map((link) => ({
        roundTemplateId: newRoundId,
        questionId: link.questionId,
      })),
    );
  }

  return newRoundId;
}

async function migrateSharedRounds(sqlite: Database) {
  const junctionExists = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='position_round_templates'",
    )
    .get();

  if (!junctionExists) {
    console.log("position_round_templates already removed — skipping data migration");
    return;
  }

  // SAFETY: PRAGMA table_info returns one row per column with a `name` field.
  const positionIdColumn = sqlite
    .prepare("PRAGMA table_info(round_template)")
    .all() as Array<{ name: string }>;

  if (!positionIdColumn.some((col) => col.name === "position_id")) {
    throw new Error(
      "round_template.position_id column missing — run 0011_position_owned_rounds.sql first",
    );
  }

  // SAFETY: COUNT(*) returns a single row with a numeric `count` column.
  const unmigratedRounds = sqlite
    .prepare(
      "SELECT COUNT(*) as count FROM round_template WHERE position_id IS NULL",
    )
    .get() as { count: number };

  if (unmigratedRounds.count === 0) {
    console.log("Shared rounds already migrated — running cleanup only");
    finalizeSchema(sqlite);
    return;
  }

  // SAFETY: the junction table's rows always carry the three selected columns.
  const junctionRows = sqlite
    .prepare("SELECT id, position_id, round_template_id FROM position_round_templates")
    .all() as PositionRoundTemplateRow[];

  const db = drizzle(sqlite);

  const linksByRound = new Map<string, PositionRoundTemplateRow[]>();
  for (const row of junctionRows) {
    const existing = linksByRound.get(row.round_template_id) ?? [];
    existing.push(row);
    linksByRound.set(row.round_template_id, existing);
  }

  const junctionToRoundId = new Map<string, string>();

  for (const [roundTemplateId, links] of linksByRound) {
    const sortedLinks = [...links].sort((a, b) => a.id.localeCompare(b.id));

    for (let i = 0; i < sortedLinks.length; i++) {
      const link = sortedLinks[i]!;
      let targetRoundId = roundTemplateId;

      if (i === 0) {
        sqlite
          .prepare("UPDATE round_template SET position_id = ? WHERE id = ?")
          .run(link.position_id, roundTemplateId);
      } else {
        targetRoundId = await duplicateRound(db, roundTemplateId, link.position_id);
      }

      junctionToRoundId.set(link.id, targetRoundId);
    }
  }

  for (const [junctionId, roundId] of junctionToRoundId) {
    sqlite
      .prepare(
        "UPDATE interview SET round_id = ? WHERE position_round_template_id = ?",
      )
      .run(roundId, junctionId);
  }

  const applications = await db
    .select({
      id: application.id,
      positionId: application.positionId,
    })
    .from(application);

  for (const app of applications) {
    const positionLinks = junctionRows.filter(
      (row) => row.position_id === app.positionId,
    );
    const oldToNew = new Map(
      positionLinks.map((link) => [
        link.round_template_id,
        junctionToRoundId.get(link.id)!,
      ]),
    );

    if (oldToNew.size === 0) continue;

    const sessions = await db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.applicationId, app.id));

    for (const session of sessions) {
      const newRoundId = oldToNew.get(session.roundId);
      if (newRoundId && newRoundId !== session.roundId) {
        await db
          .update(interviewSession)
          .set({ roundId: newRoundId })
          .where(eq(interviewSession.id, session.id));
      }
    }
  }

  console.log(
    `✅ Migrated ${junctionToRoundId.size} position-round links to owned rounds`,
  );

  finalizeSchema(sqlite);
}

function finalizeSchema(sqlite: Database) {
  const junctionExists = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='position_round_templates'",
    )
    .get();

  if (!junctionExists) {
    return;
  }

  const cleanupSql = readFileSync(
    path.join(__dirname, "0011_cleanup_position_rounds.sql"),
    "utf-8",
  );
  runSqlBatch(sqlite, cleanupSql);
  console.log("✅ Dropped position_round_templates and finalized interview.round_id");
}

async function main() {
  if (remote) {
    console.log(
      "Run shared-round migration locally first, then push data or re-run against remote.",
    );
    process.exit(1);
  }

  const sqlite = new Database(getLocalD1SqlitePath());
  try {
    await migrateSharedRounds(sqlite);
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error("❌ Shared rounds migration failed:", error);
  process.exit(1);
});
