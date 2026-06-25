import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { Department, HireLevel, PositionStatus } from "./enums";
import { position } from "./schema";
import { createDefaultRoundsForPosition } from "./create-default-rounds";

const webDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../apps/frontend",
);

const SCREENING_ROUND_NAME = "Screening/Recruiter Round";
const TECHNICAL_ROUND_NAME = "Technical Round";

type PositionSeed = {
  name: string;
  hireLevel: HireLevel;
  department: Department[];
  status?: PositionStatus;
};

const POSITIONS: PositionSeed[] = [
  {
    name: "Marketing Associate",
    hireLevel: "associate",
    department: ["management"],
  },
  {
    name: "Private Equity Operations Associate",
    hireLevel: "associate",
    department: ["operations"],
  },
  {
    name: "Senior Data Engineer",
    hireLevel: "analyst",
    department: ["operations"],
  },
  {
    name: "Origination Associate",
    hireLevel: "associate",
    department: ["origination"],
  },
  {
    name: "Data Researchers",
    hireLevel: "analyst",
    department: ["operations"],
  },
  {
    name: "Full-Stack Developer",
    hireLevel: "analyst",
    department: ["operations"],
  },
  {
    name: "Business Development Associate",
    hireLevel: "associate",
    department: ["origination"],
  },
  {
    name: "Sales Operations Analyst (Email Outreach)",
    hireLevel: "analyst",
    department: ["operations"],
  },
  {
    name: "Investment Analyst",
    hireLevel: "analyst",
    department: ["deal-team"],
  },
  {
    name: "Deliverability Engineer",
    hireLevel: "analyst",
    department: ["operations"],
  },
  {
    name: "Portfolio Manager (Resume/Reopen Posting)",
    hireLevel: "associate",
    department: ["public-markets"],
  },
  {
    name: "Automation Specialist",
    hireLevel: "analyst",
    department: ["operations"],
  },
  {
    name: "Go-To-Market (GTM) Engineer",
    hireLevel: "analyst",
    department: ["operations"],
  },
  {
    name: "Quantitative Developer",
    hireLevel: "analyst",
    department: ["public-markets"],
  },
  {
    name: "Quantitative Researcher",
    hireLevel: "analyst",
    department: ["public-markets"],
  },
  {
    name: "Execution Trader",
    hireLevel: "analyst",
    department: ["public-markets"],
  },
  {
    name: "Information Technology Lead",
    hireLevel: "vice-president",
    department: ["operations"],
    status: "hold",
  },
  {
    name: "Operations Intern",
    hireLevel: "intern",
    department: ["operations"],
  },
  {
    name: "Legal Intern",
    hireLevel: "intern",
    department: ["legal"],
  },
  {
    name: "Software Development Interns",
    hireLevel: "intern",
    department: ["operations"],
  },
  {
    name: "Origination Intern",
    hireLevel: "intern",
    department: ["origination"],
  },
  {
    name: "Capital Markets Interns",
    hireLevel: "intern",
    department: ["capital-markets"],
  },
  {
    name: "Private Equity Interns",
    hireLevel: "intern",
    department: ["deal-team"],
  },
  {
    name: "Vice President of Capital Markets (Public Equities)",
    hireLevel: "vice-president",
    department: ["public-markets"],
  },
  {
    name: "Human Resources Manager",
    hireLevel: "vice-president",
    department: ["management"],
  },
  {
    name: "Private Equity Analyst",
    hireLevel: "analyst",
    department: ["deal-team"],
  },
  {
    name: "Vice President of Marketing / Head of Investor Communications & Strategic Marketing",
    hireLevel: "vice-president",
    department: ["management"],
  },
  {
    name: "Managing Director (Deal Team)",
    hireLevel: "managing-director",
    department: ["deal-team"],
  },
  {
    name: "Vice President (Deal Team)",
    hireLevel: "vice-president",
    department: ["deal-team"],
  },
  {
    name: "Vice President Capital Markets (Investor Relation)",
    hireLevel: "vice-president",
    department: ["capital-markets"],
  },
  {
    name: "Private Equity Associate",
    hireLevel: "associate",
    department: ["deal-team"],
  },
  {
    name: "Vice President of Operations (Chief of Staff)",
    hireLevel: "vice-president",
    department: ["operations"],
  },
  {
    name: "Capital Markets Associate",
    hireLevel: "associate",
    department: ["capital-markets"],
  },
  {
    name: "Staff Attorney",
    hireLevel: "associate",
    department: ["legal"],
    status: "hold",
  },
  {
    name: "Vice President of Mergers & Acquisitions (Origination)",
    hireLevel: "vice-president",
    department: ["origination"],
  },
  {
    name: "Capital Markets IPO Associate",
    hireLevel: "associate",
    department: ["capital-markets"],
  },
  {
    name: "Vice President (PIPEs)",
    hireLevel: "vice-president",
    department: ["pipe"],
  },
  {
    name: "Vice President Origination (Proprietary)",
    hireLevel: "vice-president",
    department: ["origination"],
  },
  {
    name: "Vice President Investor Relations",
    hireLevel: "vice-president",
    department: ["capital-markets"],
  },
  {
    name: "Talent Acquisition Associate",
    hireLevel: "associate",
    department: ["management"],
  },
  {
    name: "Litigation Attorney",
    hireLevel: "associate",
    department: ["legal"],
  },
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function exportInsertedSql(sqlite: Database, positionIds: string[]): string {
  if (positionIds.length === 0) return "";

  const placeholders = positionIds.map((id) => sqlValue(id)).join(", ");
  const exportTable = (table: string, where: string) => {
    const columns = sqlite
      .prepare(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
    if (columns.length === 0) return "";

    const colNames = columns.map((c) => c.name);
    const rows = sqlite
      .prepare(
        `SELECT ${colNames.join(", ")} FROM ${table} WHERE ${where}`,
      )
      .all() as Array<Record<string, unknown>>;

    return rows
      .map((row) => {
        const values = colNames.map((col) => sqlValue(row[col])).join(", ");
        return `INSERT OR IGNORE INTO ${table} (${colNames.join(", ")}) VALUES (${values});`;
      })
      .join("\n");
  };

  return [
    "PRAGMA foreign_keys = ON;",
    exportTable("position", `id IN (${placeholders})`),
    exportTable("round_template", `position_id IN (${placeholders})`),
  ]
    .filter(Boolean)
    .join("\n");
}

async function seedPositions(remote: boolean) {
  const sqlite = new Database(getLocalD1SqlitePath());
  const db = drizzle(sqlite);

  const slugs = POSITIONS.map((p) => toSlug(p.name));
  const existing = await db
    .select({ slug: position.slug })
    .from(position)
    .where(inArray(position.slug, slugs));
  const existingSlugs = new Set(existing.map((row) => row.slug));

  const toInsert = POSITIONS.filter((p) => !existingSlugs.has(toSlug(p.name)));
  if (toInsert.length === 0) {
    console.log("All positions already exist. Nothing to insert.");
    return;
  }

  const insertedPositions = await db
    .insert(position)
    .values(
      toInsert.map((p) => ({
        name: p.name,
        slug: toSlug(p.name),
        description: null,
        department: p.department,
        hireLevel: p.hireLevel,
        status: p.status ?? "active",
      })),
    )
    .returning();

  for (const pos of insertedPositions) {
    await createDefaultRoundsForPosition(pos.id);
  }

  console.log(`✅ Inserted ${insertedPositions.length} positions`);
  console.log(
    `✅ Created default rounds for each position ("${SCREENING_ROUND_NAME}", "${TECHNICAL_ROUND_NAME}")`,
  );

  if (remote) {
    const tempDir = mkdtempSync(path.join(tmpdir(), "hr-automation-positions-"));
    const dataPath = path.join(tempDir, "positions.sql");

    try {
      const sql = exportInsertedSql(
        sqlite,
        insertedPositions.map((p) => p.id),
      );
      writeFileSync(dataPath, sql);
      console.log("☁️  Pushing new positions to remote D1...");
      runWranglerD1(dataPath, true);
      console.log("☁️  Remote D1 updated.");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

const remote = process.argv.includes("--remote");
seedPositions(remote).catch((error) => {
  console.error(error);
  process.exit(1);
});
