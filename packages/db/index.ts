import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
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

let cachedDb: NeonHttpDatabase | undefined;
let cachedSql: ReturnType<typeof neon> | undefined;

function getDb(): NeonHttpDatabase {
  if (cachedDb) {
    return cachedDb;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = cachedSql ?? neon(url);

  if (process.env.NODE_ENV !== "production") {
    cachedSql = sql;
  }

  const database = drizzle({ client: sql });
  cachedDb = database;

  return database;
}

export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, prop) {
    const database = getDb();
    const value = database[prop as keyof NeonHttpDatabase];
    if (typeof value === "function") {
      return value.bind(database);
    }
    return value;
  },
});
