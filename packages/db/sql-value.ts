import { z } from "zod";

const sqlValueSchema = z.union([
  z.null().transform(() => ({ kind: "null" }) as const),
  z.undefined().transform(() => ({ kind: "null" }) as const),
  z.string().transform((value) => ({ kind: "string", value }) as const),
  z.number().transform((value) => ({ kind: "number", value }) as const),
  z.bigint().transform((value) => ({ kind: "bigint", value }) as const),
  z.boolean().transform((value) => ({ kind: "boolean", value }) as const),
  z
    .instanceof(Uint8Array)
    .transform((value) => ({ kind: "bytes", value }) as const),
]);

export type SqlValue = z.input<typeof sqlValueSchema>;

export function formatSqlValue(value: SqlValue): string {
  const parsed = sqlValueSchema.parse(value);

  switch (parsed.kind) {
    case "null":
      return "NULL";
    case "number":
      return Number.isFinite(parsed.value) ? String(parsed.value) : "NULL";
    case "bigint":
      return parsed.value.toString();
    case "boolean":
      return parsed.value ? "1" : "0";
    case "string":
      return `'${parsed.value.replace(/'/g, "''")}'`;
    case "bytes":
      return `'${parsed.value.toString().replace(/'/g, "''")}'`;
    default: {
      const exhaustiveKind: never = parsed;
      return exhaustiveKind;
    }
  }
}
