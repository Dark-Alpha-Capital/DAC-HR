import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

function serverOnly(): never {
  throw new Error("Database access is only available on the server");
}

export function getDb(): Database {
  return serverOnly();
}

export const db = new Proxy(
  // SAFETY: the stub proxy target is never read directly — every `get` throws
  // on the client; the placeholder satisfies the Database shape for builds.
  {} as Database,
  {
    get() {
      return serverOnly();
    },
  },
);
