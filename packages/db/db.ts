import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

let cachedDb: Database | undefined;

export function getDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }

  if (!env.DB) {
    throw new Error("D1 binding DB is not available");
  }

  cachedDb = drizzle(env.DB, { schema });
  return cachedDb;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const database = getDb();
    const value = database[prop as keyof Database];
    if (typeof value === "function") {
      return value.bind(database);
    }
    return value;
  },
});
