import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("ERROR: DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL is required");
}

// Use a global variable to store the connection in development
// This prevents multiple connections from being created during hot reloads
declare global {
  // eslint-disable-next-line no-var
  var postgresClient: postgres.Sql | undefined;
}

// Create a single connection pool
// In production, this will create a new connection
// In development, it will reuse the existing connection from the global variable
const client =
  globalThis.postgresClient ??
  postgres(url, {
    // Enable SSL when url contains sslmode=require (Neon/Supabase/Heroku/Render)
    max: 10, // Maximum number of connections in the pool
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    // Prevent connection leaks
    onnotice: () => {}, // Suppress notices
  });

// In development, store the connection in the global variable
// This ensures we reuse the same connection pool during hot reloads
if (process.env.NODE_ENV !== "production") {
  globalThis.postgresClient = client;
}

export const db = drizzle(client);
