import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const webDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../apps/web",
);
config({ path: path.join(webDir, ".env") });

export default defineConfig({
  out: "./drizzle",
  schema: "./schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId:
      process.env.CLOUDFLARE_D1_DATABASE_ID ??
      "d86703d9-2aa7-42b5-91a6-995fcf0afde0",
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
