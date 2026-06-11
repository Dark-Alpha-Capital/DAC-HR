import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
  position,
  roundTemplate,
  questionBank,
  roundTemplateQuestions,
  positionRoundTemplates,
} from "./schema";

const webDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../apps/web",
);

function getLocalD1SqlitePath(): string {
  const d1Dir = path.join(
    webDir,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  const sqliteFiles = readdirSync(d1Dir).filter(
    (file) => file.endsWith(".sqlite") && file !== "metadata.sqlite",
  );
  if (sqliteFiles.length === 0) {
    throw new Error("No local D1 database found. Run bun run db:migrate first.");
  }
  return path.join(d1Dir, sqliteFiles[0]!);
}

async function seed() {
  const migrateTarget = "--local";

  const migrate = spawnSync(
    "bunx",
    [
      "wrangler",
      "d1",
      "migrations",
      "apply",
      "hr-automation-db",
      migrateTarget,
    ],
    { cwd: webDir, stdio: "inherit" },
  );
  if (migrate.status !== 0) {
    throw new Error(
      `Failed to apply D1 migrations (${migrateTarget}) before seeding`,
    );
  }

  const sqlite = new Database(getLocalD1SqlitePath());
  const db = drizzle(sqlite);

  console.log("🌱 Seeding local D1 database...");

  const positions = [
    {
      name: "Frontend Developer",
      slug: "frontend-developer",
      description:
        "Build responsive and performant user interfaces using modern JavaScript frameworks",
    },
    {
      name: "Backend Developer",
      slug: "backend-developer",
      description:
        "Design and implement scalable server-side applications and APIs",
    },
    {
      name: "Fullstack Developer",
      slug: "fullstack-developer",
      description:
        "Work across the entire stack, from database to user interface",
    },
    {
      name: "HR Assistant",
      slug: "hr-assistant",
      description:
        "Support HR operations including recruitment, onboarding, and employee relations",
    },
    {
      name: "DevOps Engineer",
      slug: "devops-engineer",
      description:
        "Manage infrastructure, CI/CD pipelines, and deployment automation",
    },
  ];

  const insertedPositions = await db
    .insert(position)
    .values(positions)
    .returning();

  console.log(`✅ Created ${insertedPositions.length} positions`);

  const roundTemplates = [
    { name: "Screening", description: "Initial screening round" },
    { name: "Technical", description: "Technical assessment round" },
    {
      name: "Final Executive",
      description: "Final interview with leadership",
    },
  ];

  const insertedRounds = await db
    .insert(roundTemplate)
    .values(roundTemplates)
    .returning();

  console.log(`✅ Created ${insertedRounds.length} round templates`);

  const questions = [
    {
      questionText:
        "Describe your experience with React and state management libraries.",
      questionType: "text" as const,
      category: "technical" as const,
      timeLimitSeconds: 300,
      orderIndex: 1,
    },
    {
      questionText:
        "How do you approach debugging a performance issue in a web application?",
      questionType: "text" as const,
      category: "technical" as const,
      timeLimitSeconds: 300,
      orderIndex: 2,
    },
    {
      questionText:
        "Tell us about a challenging project you worked on and how you handled it.",
      questionType: "text" as const,
      category: "behavioral" as const,
      timeLimitSeconds: 300,
      orderIndex: 3,
    },
    {
      questionText: "Why are you interested in joining Dark Alpha Capital?",
      questionType: "text" as const,
      category: "screening" as const,
      timeLimitSeconds: 180,
      orderIndex: 4,
    },
  ];

  const insertedQuestions = await db
    .insert(questionBank)
    .values(questions)
    .returning();

  console.log(`✅ Created ${insertedQuestions.length} questions`);

  const screeningRound = insertedRounds.find((r) => r.name === "Screening");
  const technicalRound = insertedRounds.find((r) => r.name === "Technical");

  if (screeningRound && technicalRound) {
    await db.insert(roundTemplateQuestions).values([
      {
        roundTemplateId: screeningRound.id,
        questionId: insertedQuestions[3]!.id,
      },
      {
        roundTemplateId: technicalRound.id,
        questionId: insertedQuestions[0]!.id,
      },
      {
        roundTemplateId: technicalRound.id,
        questionId: insertedQuestions[1]!.id,
      },
    ]);

    for (const pos of insertedPositions) {
      await db.insert(positionRoundTemplates).values([
        { positionId: pos.id, roundTemplateId: screeningRound.id },
        { positionId: pos.id, roundTemplateId: technicalRound.id },
      ]);
    }

    console.log("✅ Linked rounds, questions, and positions");
  }

  console.log("🎉 Seed completed successfully");
}

seed().catch((error) => {
  console.error("❌ Seed failed", error);
  process.exit(1);
});
