/**
 * Reproducible fix for a corrupted/outdated local wrangler dev state.
 *
 * Local D1 / Durable Object / workflow state lives in `.wrangler/state`. When
 * workerd is upgraded the on-disk sqlite (e.g. the internal `_cf_ALARM` table)
 * can no longer be read and every local wrangler command dies with a SQLite
 * error. This clears that state (it is dev-ephemeral and gitignored) and
 * re-applies every migration from scratch, so the local DB exactly matches
 * `schema.ts`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.resolve(pkgDir, "../../apps/frontend");

const targets = [
  path.join(webDir, ".wrangler", "state"),
  path.join(pkgDir, ".wrangler", "state"),
];

console.log(
  "⚠️  Clearing local wrangler/miniflare state (D1, Durable Objects, workflows, observability)...",
);
for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`   removed ${target}`);
  }
}

console.log("Re-applying all migrations from scratch...");
const result = spawnSync("bun", ["run", "migrate.ts"], {
  cwd: pkgDir,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
