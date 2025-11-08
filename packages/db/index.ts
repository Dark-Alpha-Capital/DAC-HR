import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("ERROR: DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL is required");
}

// Use a global variable to prevent multiple client instances
// This is important in Next.js dev mode where modules can be reloaded
declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined;
}

// Create a singleton client instance
const client =
  global.__dbClient ??
  postgres(url, {
    // Enable SSL when url contains sslmode=require (Neon/Supabase/Heroku/Render)
    max: 5, // Reduced from 10 to prevent too many connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout
  });

// In development, store the client in global to prevent multiple instances
if (process.env.NODE_ENV !== "production") {
  global.__dbClient = client;
}

export const db = drizzle(client);
