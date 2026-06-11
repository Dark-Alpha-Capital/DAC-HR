import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../../apps/web");
const target = process.argv.includes("--remote") ? "--remote" : "--local";

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

console.log("✅ Migrations completed");
