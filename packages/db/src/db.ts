/// <reference types="@cloudflare/workers-types" />
/// <reference path="./cloudflare-workers.d.ts" />
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

export function getDb(): Database {
  if (!env.DB) {
    throw new Error(
      "D1 binding DB is not available. Check wrangler.jsonc d1_databases and redeploy.",
    );
  }

  return drizzle(env.DB, { schema });
}

export const db = new Proxy(
  // SAFETY: the proxy target is never read directly; every `get` forwards to
  // the lazily-initialized `getDb()` instance.
  {} as Database,
  {
    get(_target, prop) {
      const database = getDb();
      const value = database[
        // SAFETY: `prop` is a property name read through the proxy; it is
        // widened to the Database key set for the member lookup below.
        prop as keyof Database
      ];
      return value instanceof Function ? value.bind(database) : value;
    },
  },
);
