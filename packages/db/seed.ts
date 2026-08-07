import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { ApplicationStatus } from "./enums";
import {
  application,
  candidate,
  candidatePosition,
  interview,
  interviewSession,
  position,
  questionBank,
  roundTemplate,
  roundTemplateQuestions,
  user,
} from "./schema";
import { CLEAR_SEED_SQL, exportSeedDataSql } from "./seed-sql";
import { splitLocation } from "./location";
import { createPositionInterviewBundle } from "./repositories/interview-bundle-repository";

const webDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../apps/frontend",
);

const SEED_USER_ID = "00000000-0000-4000-8000-000000000001";
const SEED_SESSION_TOKEN_PENDING = "11111111-1111-4111-8111-111111111111";
const SEED_SESSION_TOKEN_IN_PROGRESS = "22222222-2222-4222-8222-222222222222";
const SEED_SESSION_TOKEN_COMPLETED = "33333333-3333-4333-8333-333333333333";

function getLocalD1SqlitePath(): string {
  const d1Dir = path.join(
    webDir,
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  const sqliteFiles = readdirSync(d1Dir).filter(
    (file) => file.endsWith(".sqlite") && file !== "metadata.sqlite",
  );
  if (sqliteFiles.length === 0) {
    throw new Error(
      "No local D1 database found. Run bun run db:migrate first.",
    );
  }
  return path.join(d1Dir, sqliteFiles[0]!);
}

function clearSeedData(sqlite: Database) {
  sqlite.exec("PRAGMA foreign_keys = OFF");
  const tables = [
    "interview_response",
    "interview_evaluation",
    "interview_session",
    "interview_ai_analysis",
    "interview_feedback",
    "interview",
    "candidate_ai_screening",
    "candidate_onboarding",
    "candidate_document",
    "application",
    "candidate_position",
    "candidate",
    "round_template_questions",
    "question_bank",
    "round_template",
    "position",
  ];
  for (const table of tables) {
    sqlite.run(`DELETE FROM ${table}`);
  }
  sqlite.exec("PRAGMA foreign_keys = ON");
}

function runWranglerD1(filePath: string, remote: boolean) {
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

function applyMigrations(remote: boolean) {
  const target = remote ? "--remote" : "--local";
  const migrate = spawnSync(
    "bunx",
    ["wrangler", "d1", "migrations", "apply", "hr-automation-db", target],
    { cwd: webDir, stdio: "inherit" },
  );
  if (migrate.status !== 0) {
    throw new Error(`Failed to apply D1 migrations (${target})`);
  }
}

function pushSeedToRemote(sqlite: Database) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "hr-automation-seed-"));
  const clearPath = path.join(tempDir, "clear.sql");
  const dataPath = path.join(tempDir, "data.sql");

  try {
    writeFileSync(clearPath, CLEAR_SEED_SQL);
    writeFileSync(dataPath, exportSeedDataSql(sqlite));

    console.log("☁️  Clearing existing seed data on remote D1...");
    runWranglerD1(clearPath, true);

    console.log("☁️  Uploading seed data to remote D1...");
    runWranglerD1(dataPath, true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function seed() {
  const seedRemote = process.argv.includes("--remote");

  applyMigrations(false);
  if (seedRemote) {
    applyMigrations(true);
  }

  const sqlite = new Database(getLocalD1SqlitePath());
  clearSeedData(sqlite);
  const db = drizzle(sqlite);

  console.log(
    seedRemote
      ? "🌱 Building seed data locally, then pushing to remote D1..."
      : "🌱 Seeding local D1 database (fresh)...",
  );

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
      hireLevel: "analyst" as const,
    },
    {
      name: "Backend Developer",
      slug: "backend-developer",
      description:
        "Design and implement scalable server-side applications and APIs",
      hireLevel: "analyst" as const,
    },
    {
      name: "Fullstack Developer",
      slug: "fullstack-developer",
      description:
        "Work across the entire stack, from database to user interface",
      hireLevel: "associate" as const,
    },
    {
      name: "HR Assistant",
      slug: "hr-assistant",
      description:
        "Support HR operations including recruitment, onboarding, and employee relations",
      hireLevel: "analyst" as const,
    },
    {
      name: "DevOps Engineer",
      slug: "devops-engineer",
      description:
        "Manage infrastructure, CI/CD pipelines, and deployment automation",
      hireLevel: "associate" as const,
    },
  ];

  const insertedPositions = await db
    .insert(position)
    .values(positions)
    .returning();

  const questionTemplates = [
    {
      questionText: "Why are you interested in joining Dark Alpha Capital?",
      questionType: "text" as const,
      category: "screening" as const,
      timeLimitSeconds: 180,
      orderIndex: 1,
    },
    {
      questionText: "What is your expected timeline to start if offered?",
      questionType: "text" as const,
      category: "screening" as const,
      timeLimitSeconds: 120,
      orderIndex: 2,
    },
    {
      questionText: "Are you authorized to work in the United States?",
      questionType: "mcq" as const,
      category: "screening" as const,
      options: [
        { id: "yes", text: "Yes" },
        { id: "no", text: "No" },
        { id: "sponsorship", text: "Will require sponsorship" },
      ],
      timeLimitSeconds: 60,
      orderIndex: 3,
    },
    {
      questionText: "How did you hear about this role?",
      questionType: "mcq" as const,
      category: "screening" as const,
      options: [
        { id: "linkedin", text: "LinkedIn" },
        { id: "referral", text: "Employee referral" },
        { id: "website", text: "Company website" },
        { id: "other", text: "Other" },
      ],
      timeLimitSeconds: 60,
      orderIndex: 4,
    },
    {
      questionText: "Summarize your relevant experience in 2–3 sentences.",
      questionType: "text" as const,
      category: "screening" as const,
      timeLimitSeconds: 180,
      orderIndex: 5,
    },
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
      orderIndex: 3,
    },
    {
      questionText:
        "Explain how you would design a REST API for a resource with nested relationships.",
      questionType: "text" as const,
      category: "technical" as const,
      timeLimitSeconds: 300,
      orderIndex: 4,
    },
    {
      questionText:
        "What strategies do you use to ensure database query performance at scale?",
      questionType: "text" as const,
      category: "technical" as const,
      timeLimitSeconds: 300,
      orderIndex: 5,
    },
    {
      questionText:
        "How do you manage CI/CD pipelines for a production application?",
      questionType: "text" as const,
      category: "technical" as const,
      timeLimitSeconds: 300,
      orderIndex: 6,
    },
    {
      questionText:
        "Which testing approach do you prefer for frontend components?",
      questionType: "mcq" as const,
      category: "technical" as const,
      options: [
        { id: "unit", text: "Unit tests only" },
        { id: "integration", text: "Integration tests" },
        { id: "e2e", text: "End-to-end tests" },
        { id: "all", text: "Combination of all three" },
      ],
      timeLimitSeconds: 120,
      orderIndex: 7,
    },
    {
      questionText:
        "Walk through how you would containerize and deploy a Node.js service.",
      questionType: "text" as const,
      category: "technical" as const,
      timeLimitSeconds: 300,
      orderIndex: 8,
    },
    {
      questionText:
        "Tell us about a challenging project you worked on and how you handled it.",
      questionType: "text" as const,
      category: "behavioral" as const,
      timeLimitSeconds: 300,
      orderIndex: 1,
    },
    {
      questionText:
        "Describe a time you disagreed with a teammate. How did you resolve it?",
      questionType: "text" as const,
      category: "behavioral" as const,
      timeLimitSeconds: 300,
      orderIndex: 2,
    },
    {
      questionText:
        "Give an example of when you had to learn a new technology quickly.",
      questionType: "text" as const,
      category: "behavioral" as const,
      timeLimitSeconds: 300,
      orderIndex: 3,
    },
    {
      questionText:
        "How do you prioritize tasks when facing multiple deadlines?",
      questionType: "text" as const,
      category: "behavioral" as const,
      timeLimitSeconds: 240,
      orderIndex: 4,
    },
    {
      questionText: "What motivates you most in your professional work?",
      questionType: "text" as const,
      category: "behavioral" as const,
      timeLimitSeconds: 180,
      orderIndex: 5,
    },
  ];

  type RoundIdsByPosition = {
    screeningRoundId: string;
    technicalRoundId: string;
    finalRoundId?: string;
    screeningQuestionIds: string[];
  };

  const roundsByPositionSlug: Record<string, RoundIdsByPosition> = {};

  for (const pos of insertedPositions) {
    const roundValues = [
      {
        positionId: pos.id,
        name: "Screening",
        description: "Initial screening round",
      },
      {
        positionId: pos.id,
        name: "Technical",
        description: "Technical assessment round",
      },
      ...(pos.slug !== "hr-assistant"
        ? [
            {
              positionId: pos.id,
              name: "Final Executive",
              description: "Final interview with leadership",
            },
          ]
        : []),
    ];

    const insertedRounds = await db
      .insert(roundTemplate)
      .values(roundValues)
      .returning();

    const screeningRound = insertedRounds.find((r) => r.name === "Screening")!;
    const technicalRound = insertedRounds.find((r) => r.name === "Technical")!;
    const finalRound = insertedRounds.find((r) => r.name === "Final Executive");

    const insertedQuestions = await db
      .insert(questionBank)
      .values(questionTemplates)
      .returning();

    const byCategory = (cat: string) =>
      insertedQuestions.filter((q) => q.category === cat);

    const screeningQuestions = byCategory("screening");
    const technicalQuestions = byCategory("technical");
    const behavioralQuestions = byCategory("behavioral");

    await db.insert(roundTemplateQuestions).values([
      ...screeningQuestions.map((q) => ({
        roundTemplateId: screeningRound.id,
        questionId: q.id,
      })),
      ...technicalQuestions.map((q) => ({
        roundTemplateId: technicalRound.id,
        questionId: q.id,
      })),
      ...(finalRound
        ? behavioralQuestions.map((q) => ({
            roundTemplateId: finalRound.id,
            questionId: q.id,
          }))
        : []),
    ]);

    roundsByPositionSlug[pos.slug] = {
      screeningRoundId: screeningRound.id,
      technicalRoundId: technicalRound.id,
      finalRoundId: finalRound?.id,
      screeningQuestionIds: screeningQuestions.map((q) => q.id),
    };
  }

  const positionBySlug = Object.fromEntries(
    insertedPositions.map((p) => [p.slug, p]),
  );

  const seedCandidates: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    source: string;
    positionSlug: string;
    status: ApplicationStatus;
  }> = [
    {
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice.johnson@seed.demo",
      phone: "+1-555-0101",
      location: "New York, NY",
      source: "LinkedIn",
      positionSlug: "frontend-developer",
      status: "technical_round",
    },
    {
      firstName: "Bob",
      lastName: "Chen",
      email: "bob.chen@seed.demo",
      phone: "+1-555-0102",
      location: "San Francisco, CA",
      source: "Referral",
      positionSlug: "frontend-developer",
      status: "technical_round",
    },
    {
      firstName: "Diana",
      lastName: "Patel",
      email: "diana.patel@seed.demo",
      phone: "+1-555-0104",
      location: "Chicago, IL",
      source: "LinkedIn",
      positionSlug: "frontend-developer",
      status: "first_round",
    },
    {
      firstName: "Ethan",
      lastName: "Williams",
      email: "ethan.williams@seed.demo",
      phone: "+1-555-0105",
      location: "Seattle, WA",
      source: "Indeed",
      positionSlug: "frontend-developer",
      status: "ai_screening",
    },
    {
      firstName: "Carol",
      lastName: "Martinez",
      email: "carol.martinez@seed.demo",
      phone: "+1-555-0103",
      location: "Austin, TX",
      source: "Company Website",
      positionSlug: "backend-developer",
      status: "technical_round",
    },
    {
      firstName: "Frank",
      lastName: "Nguyen",
      email: "frank.nguyen@seed.demo",
      phone: "+1-555-0106",
      location: "Denver, CO",
      source: "LinkedIn",
      positionSlug: "backend-developer",
      status: "offer_agreement",
    },
    {
      firstName: "Grace",
      lastName: "Kim",
      email: "grace.kim@seed.demo",
      phone: "+1-555-0107",
      location: "Boston, MA",
      source: "Referral",
      positionSlug: "backend-developer",
      status: "first_round",
    },
    {
      firstName: "Henry",
      lastName: "Davis",
      email: "henry.davis@seed.demo",
      phone: "+1-555-0108",
      location: "Miami, FL",
      source: "Handshake",
      positionSlug: "fullstack-developer",
      status: "contract_offer",
    },
    {
      firstName: "Ivy",
      lastName: "Brown",
      email: "ivy.brown@seed.demo",
      phone: "+1-555-0109",
      location: "Portland, OR",
      source: "LinkedIn",
      positionSlug: "fullstack-developer",
      status: "ai_screening",
    },
    {
      firstName: "Jack",
      lastName: "Wilson",
      email: "jack.wilson@seed.demo",
      phone: "+1-555-0110",
      location: "Los Angeles, CA",
      source: "Agency",
      positionSlug: "fullstack-developer",
      status: "onboarding",
    },
    {
      firstName: "Karen",
      lastName: "Lee",
      email: "karen.lee@seed.demo",
      phone: "+1-555-0111",
      location: "Philadelphia, PA",
      source: "LinkedIn",
      positionSlug: "devops-engineer",
      status: "technical_round",
    },
    {
      firstName: "Leo",
      lastName: "Garcia",
      email: "leo.garcia@seed.demo",
      phone: "+1-555-0112",
      location: "Dallas, TX",
      source: "Referral",
      positionSlug: "devops-engineer",
      status: "first_round",
    },
    {
      firstName: "Mia",
      lastName: "Taylor",
      email: "mia.taylor@seed.demo",
      phone: "+1-555-0113",
      location: "Atlanta, GA",
      source: "Company Website",
      positionSlug: "hr-assistant",
      status: "ai_screening",
    },
    {
      firstName: "Noah",
      lastName: "Anderson",
      email: "noah.anderson@seed.demo",
      phone: "+1-555-0114",
      location: "Nashville, TN",
      source: "Indeed",
      positionSlug: "hr-assistant",
      status: "first_round",
    },
    {
      firstName: "Olivia",
      lastName: "Thomas",
      email: "olivia.thomas@seed.demo",
      phone: "+1-555-0115",
      location: "Remote",
      source: "LinkedIn",
      positionSlug: "frontend-developer",
      status: "rejected",
    },
  ];

  let aliceApplicationId: string | null = null;

  for (const seedCandidate of seedCandidates) {
    const pos = positionBySlug[seedCandidate.positionSlug];
    if (!pos) continue;

    const { city: locationCity, state: locationState } = splitLocation(
      seedCandidate.location,
    );

    const [newCandidate] = await db
      .insert(candidate)
      .values({
        firstName: seedCandidate.firstName,
        lastName: seedCandidate.lastName,
        email: seedCandidate.email,
        phone: seedCandidate.phone,
        locationCity,
        locationState,
        location: seedCandidate.location,
        source: seedCandidate.source,
      })
      .returning();

    if (!newCandidate) continue;

    const [newApplication] = await db
      .insert(application)
      .values({
        candidateId: newCandidate.id,
        positionId: pos.id,
        status: seedCandidate.status,
      })
      .returning();

    await db.insert(candidatePosition).values({
      candidateId: newCandidate.id,
      positionId: pos.id,
    });

    if (!newApplication) continue;

    if (seedCandidate.email === "alice.johnson@seed.demo") {
      aliceApplicationId = newApplication.id;
    }

    const positionRounds = roundsByPositionSlug[seedCandidate.positionSlug];
    if (positionRounds) {
      const roundIds = [
        positionRounds.screeningRoundId,
        positionRounds.technicalRoundId,
        ...(positionRounds.finalRoundId ? [positionRounds.finalRoundId] : []),
      ];

      for (const roundId of roundIds) {
        await db
          .insert(interview)
          .values({
            applicationId: newApplication.id,
            roundId,
            interviewerId: SEED_USER_ID,
            status: "pending",
          })
          .onConflictDoNothing();
      }
    }
  }

  const frontendRounds = roundsByPositionSlug["frontend-developer"];

  if (aliceApplicationId && frontendRounds) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await createPositionInterviewBundle({
      applicationId: aliceApplicationId,
      roundConfigs: [
        {
          roundId: frontendRounds.screeningRoundId,
          deliveryMode: "form",
        },
        {
          roundId: frontendRounds.technicalRoundId,
          deliveryMode: "voice",
        },
        ...(frontendRounds.finalRoundId
          ? [
              {
                roundId: frontendRounds.finalRoundId,
                deliveryMode: "form" as const,
              },
            ]
          : []),
      ],
      expiresAt,
    });

    // Legacy single-session tokens for backward compatibility testing
    const startedAt = new Date(Date.now() - 30 * 60 * 1000);
    const completedAt = new Date(Date.now() - 10 * 60 * 1000);
    const legacyInterviewId = crypto.randomUUID();

    await db.insert(interview).values({
      id: legacyInterviewId,
      applicationId: aliceApplicationId,
      roundId: frontendRounds.screeningRoundId,
      mode: "ai_session",
      status: "completed",
    });

    await db.insert(interviewSession).values({
      token: SEED_SESSION_TOKEN_COMPLETED,
      interviewId: legacyInterviewId,
      applicationId: aliceApplicationId,
      roundId: frontendRounds.screeningRoundId,
      expiresAt,
      status: "completed",
      startedAt,
      completedAt,
      tabSwitches: 0,
      deliveryMode: "form",
    });
  }

  console.log(`✅ ${insertedPositions.length} positions`);
  console.log(`✅ Per-position rounds and questions seeded`);
  console.log(
    `✅ ${seedCandidates.length} candidates with applications & interview rounds`,
  );
  console.log(
    `✅ 3 sample interview sessions (pending, in-progress, completed)`,
  );

  if (seedRemote) {
    pushSeedToRemote(sqlite);
    console.log("✅ Remote D1 updated (hr-automation-db)");
  }

  console.log("");
  console.log(
    seedRemote
      ? "🎉 Remote seed completed successfully"
      : "🎉 Local seed completed successfully",
  );
  console.log("");
  console.log("AI Interview links (create from Application detail page):");
  console.log("");
  console.log("Pre-seeded candidate interview links (Alice Johnson):");
  console.log(`  • Pending:      /interview/${SEED_SESSION_TOKEN_PENDING}`);
  console.log(`  • In progress:  /interview/${SEED_SESSION_TOKEN_IN_PROGRESS}`);
  console.log(`  • Completed:    /interview/${SEED_SESSION_TOKEN_COMPLETED}`);
}

seed().catch((error) => {
  console.error("❌ Seed failed", error);
  process.exit(1);
});
