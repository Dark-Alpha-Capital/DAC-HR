import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("ERROR: DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL is required");
}

declare global {
  // eslint-disable-next-line no-var
  var postgresClient: postgres.Sql | undefined;
}

const client =
  globalThis.postgresClient ??
  postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
    debug: process.env.NODE_ENV === "development" ? console.log : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.postgresClient = client;
}

export const db = drizzle(client);
