import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

function serverOnly(): never {
  throw new Error("Database access is only available on the server");
}

export function getDb(): Database {
  return serverOnly();
}

export const db = new Proxy({} as Database, {
  get() {
    return serverOnly();
  },
});
