import { eq } from "@workspace/db";
import { db } from "@workspace/db/db";
import { candidate } from "@workspace/db/schema";
import { normalizeName } from "./normalize-name";

export async function findExistingCandidate(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}): Promise<{ id: string; email: string } | null> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (normalizedEmail) {
    const rows = await db.select().from(candidate);
    const byEmail = rows.find(
      (row) => row.email.trim().toLowerCase() === normalizedEmail,
    );
    if (byEmail) {
      return { id: byEmail.id, email: byEmail.email };
    }
  }

  const phone = input.phone?.trim();
  if (!phone) {
    return null;
  }

  const normalizedFirst = normalizeName(input.firstName);
  const normalizedLast = normalizeName(input.lastName);
  if (!normalizedFirst || !normalizedLast) {
    return null;
  }

  const rowsWithPhone = await db
    .select()
    .from(candidate)
    .where(eq(candidate.phone, phone));

  const nameMatch = rowsWithPhone.find(
    (row) =>
      normalizeName(row.firstName) === normalizedFirst &&
      normalizeName(row.lastName) === normalizedLast,
  );

  return nameMatch
    ? { id: nameMatch.id, email: nameMatch.email }
    : null;
}
