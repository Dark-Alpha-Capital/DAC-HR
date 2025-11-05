import "dotenv/config"; // Make sure to load your .env file
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle", // Directory for migration files
  schema: "./schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Use the URL from your .env
  },
});
