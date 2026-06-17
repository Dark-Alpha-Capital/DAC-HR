import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
  application,
  candidate,
  candidatePosition,
  interview,
  position,
  positionRoundTemplates,
  questionBank,
  roundTemplate,
  roundTemplateQuestions,
  user,
} from "./schema";

const webDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../apps/frontend",
);

const SEED_USER_ID = "00000000-0000-4000-8000-000000000001";

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

  const [existingPosition] = await db
    .select({ id: position.id })
    .from(position)
    .where(eq(position.slug, "frontend-developer"))
    .limit(1);

  if (existingPosition) {
    console.log("ℹ️  Seed data already exists — skipping (delete local D1 to reseed)");
    return;
  }

  console.log("🌱 Seeding local D1 database...");

  await db
    .insert(user)
    .values({
      id: SEED_USER_ID,
      name: "Seed Admin",
      email: "seed-admin@darkalphacapital.com",
      emailVerified: true,
      role: "admin",
    })
    .onConflictDoNothing();

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
    {
      questionText:
        "Which of the following best describes your experience with TypeScript?",
      questionType: "mcq" as const,
      category: "technical" as const,
      options: [
        { id: "a", text: "No experience" },
        { id: "b", text: "Basic — used occasionally" },
        { id: "c", text: "Intermediate — use regularly" },
        { id: "d", text: "Advanced — expert level" },
      ],
      timeLimitSeconds: 120,
      orderIndex: 5,
    },
  ];

  const insertedQuestions = await db
    .insert(questionBank)
    .values(questions)
    .returning();

  console.log(`✅ Created ${insertedQuestions.length} questions`);

  const screeningRound = insertedRounds.find((r) => r.name === "Screening");
  const technicalRound = insertedRounds.find((r) => r.name === "Technical");
  const finalRound = insertedRounds.find((r) => r.name === "Final Executive");

  if (screeningRound && technicalRound && finalRound) {
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
      {
        roundTemplateId: technicalRound.id,
        questionId: insertedQuestions[4]!.id,
      },
      {
        roundTemplateId: finalRound.id,
        questionId: insertedQuestions[2]!.id,
      },
    ]);

    const positionRoundRows: Array<{
      positionId: string;
      roundTemplateId: string;
    }> = [];

    for (const pos of insertedPositions) {
      positionRoundRows.push(
        { positionId: pos.id, roundTemplateId: screeningRound.id },
        { positionId: pos.id, roundTemplateId: technicalRound.id },
      );
      if (pos.slug === "frontend-developer" || pos.slug === "fullstack-developer") {
        positionRoundRows.push({
          positionId: pos.id,
          roundTemplateId: finalRound.id,
        });
      }
    }

    await db.insert(positionRoundTemplates).values(positionRoundRows);

    console.log("✅ Linked rounds, questions, and positions");
  }

  const frontendPosition = insertedPositions.find(
    (p) => p.slug === "frontend-developer",
  )!;
  const backendPosition = insertedPositions.find(
    (p) => p.slug === "backend-developer",
  )!;

  const seedCandidates = [
    {
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice.johnson@seed.demo",
      phone: "+1-555-0101",
      location: "New York, NY",
      source: "LinkedIn",
      positionId: frontendPosition.id,
    },
    {
      firstName: "Bob",
      lastName: "Chen",
      email: "bob.chen@seed.demo",
      phone: "+1-555-0102",
      location: "San Francisco, CA",
      source: "Referral",
      positionId: frontendPosition.id,
    },
    {
      firstName: "Carol",
      lastName: "Martinez",
      email: "carol.martinez@seed.demo",
      phone: "+1-555-0103",
      location: "Austin, TX",
      source: "Company Website",
      positionId: backendPosition.id,
    },
  ];

  for (const seed of seedCandidates) {
    const [newCandidate] = await db
      .insert(candidate)
      .values({
        firstName: seed.firstName,
        lastName: seed.lastName,
        email: seed.email,
        phone: seed.phone,
        location: seed.location,
        source: seed.source,
      })
      .returning();

    if (!newCandidate) continue;

    const [newApplication] = await db
      .insert(application)
      .values({
        candidateId: newCandidate.id,
        positionId: seed.positionId,
        status: "second_round_technical_screening",
      })
      .returning();

    await db.insert(candidatePosition).values({
      candidateId: newCandidate.id,
      positionId: seed.positionId,
    });

    if (!newApplication) continue;

    const roundsForPosition = await db
      .select()
      .from(positionRoundTemplates)
      .where(eq(positionRoundTemplates.positionId, seed.positionId));

    for (const prt of roundsForPosition) {
      await db
        .insert(interview)
        .values({
          applicationId: newApplication.id,
          positionRoundTemplateId: prt.id,
          interviewerId: SEED_USER_ID,
          status: "pending",
        })
        .onConflictDoNothing();
    }
  }

  console.log(`✅ Created ${seedCandidates.length} candidates with applications and interview rounds`);

  console.log("🎉 Seed completed successfully");
  console.log("");
  console.log("Try interview sessions:");
  console.log("  1. Go to /interview-sessions/new");
  console.log("  2. Pick Alice Johnson or Bob Chen — Frontend Developer");
  console.log("  3. Select Screening or Technical round");
}

seed().catch((error) => {
  console.error("❌ Seed failed", error);
  process.exit(1);
});
