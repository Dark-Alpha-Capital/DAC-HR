import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("ERROR: DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL is required");
}

const client = postgres(url, {
  // Enable SSL when url contains sslmode=require (Neon/Supabase/Heroku/Render)
  max: 10,
});

export const db = drizzle(client);
