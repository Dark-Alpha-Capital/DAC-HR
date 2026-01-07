import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
export {
  eq,
  and,
  or,
  sql,
  asc,
  desc,
  inArray,
  count,
  gte,
  lte,
} from "drizzle-orm";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

let cachedDb: PostgresJsDatabase | undefined;
let cachedClient: postgres.Sql | undefined;

function getDb(): PostgresJsDatabase {
  if (cachedDb) {
    return cachedDb;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client =
    cachedClient ??
    postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {},
      debug: process.env.NODE_ENV === "development" ? console.log : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    cachedClient = client;
  }

  const database = drizzle(client);
  cachedDb = database;

  return database;
}

export const db = new Proxy({} as PostgresJsDatabase, {
  get(_target, prop) {
    const database = getDb();
    const value = database[prop as keyof PostgresJsDatabase];
    if (typeof value === "function") {
      return value.bind(database);
    }
    return value;
  },
});
