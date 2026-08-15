/**
 * Schema-sync guard: runs `drizzle-kit generate` and fails if it would produce
 * a new migration. Use before pushing to prove `schema.ts` has no pending
 * changes — keeps local and remote databases aligned with the single source.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync("bunx", ["drizzle-kit", "generate"], {
  cwd: pkgDir,
  stdio: "pipe",
  env: process.env,
});

const output =
  `${result.stdout?.toString() ?? ""}${result.stderr?.toString() ?? ""}`;

if (output.includes("Your SQL migration file")) {
  console.error(
    "❌ Schema drift: `drizzle-kit generate` produced a new migration.",
  );
  console.error(
    "   Run `bun run db:generate`, review the SQL, and commit it (plus the journal/snapshot) before pushing.",
  );
  process.exit(1);
}

if (result.status !== 0 && !output.includes("No schema changes")) {
  console.error("❌ drizzle-kit generate failed:");
  process.stderr.write(output);
  process.exit(result.status ?? 1);
}

console.log("✅ Schema is in sync — no pending migrations.");
