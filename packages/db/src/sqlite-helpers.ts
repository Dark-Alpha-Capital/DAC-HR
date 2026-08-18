import { sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export function ilike(column: SQLiteColumn, pattern: string): SQL {
  const escaped = pattern.replace(/'/g, "''");
  return sql`lower(${column}) like lower(${sql.raw(`'${escaped}'`)})`;
}

export function jsonArrayOverlap(
  column: SQLiteColumn,
  values: readonly string[],
): SQL {
  if (values.length === 0) {
    return sql`0`;
  }
  const literals = values.map(
    (value) => sql`${value}`,
  );
  return sql`EXISTS (SELECT 1 FROM json_each(${column}) WHERE json_each.value IN (${sql.join(literals, sql`, `)}))`;
}

export function jsonArrayTagSearch(
  column: SQLiteColumn,
  searchTerm: string,
): SQL {
  const escaped = searchTerm.replace(/'/g, "''");
  return sql`EXISTS (
    SELECT 1 FROM json_each(${column})
    WHERE lower(json_each.value) LIKE ${sql.raw(`'%${escaped}%'`)}
  )`;
}
