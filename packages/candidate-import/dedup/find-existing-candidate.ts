import { eq, sql } from "@workspace/db";
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
    const [byEmail] = await db
      .select({ id: candidate.id, email: candidate.email })
      .from(candidate)
      .where(sql`lower(${candidate.email}) = ${normalizedEmail}`)
      .limit(1);

    if (byEmail) {
      return byEmail;
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
    .select({
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    })
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
