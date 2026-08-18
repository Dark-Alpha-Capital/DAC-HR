import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../../../apps/frontend");
const isRemote = process.argv.includes("--remote");
const target = isRemote ? "--remote" : "--local";

console.log(`⏳ Applying D1 migrations (${target.replace("--", "")})...`);

const result = spawnSync(
  "bunx",
  ["wrangler", "d1", "migrations", "apply", "hr-automation-db", target],
  {
    cwd: webDir,
    stdio: "inherit",
    env: process.env,
  },
);

if (result.status !== 0) {
  console.error("❌ Migration failed");
  process.exit(result.status ?? 1);
}

const finalizeArgs = process.argv.includes("--remote") ? ["--remote"] : [];
const finalizeResult = spawnSync(
  "bun",
  ["run", "./finalize-interview-schema.ts", ...finalizeArgs],
  {
    cwd: __dirname,
    stdio: "inherit",
    env: process.env,
  },
);

if (finalizeResult.status !== 0) {
  console.error("❌ Interview schema finalization failed");
  process.exit(finalizeResult.status ?? 1);
}

if (!process.argv.includes("--remote")) {
  const sharedRoundsResult = spawnSync(
    "bun",
    ["run", "./migrate-shared-rounds.ts"],
    {
      cwd: __dirname,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (sharedRoundsResult.status !== 0) {
    console.error("❌ Shared rounds data migration failed");
    process.exit(sharedRoundsResult.status ?? 1);
  }
}

console.log("✅ Migrations completed");
