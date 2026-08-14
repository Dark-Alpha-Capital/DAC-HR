import { z } from "zod";
import type { ResumeFields } from "../types";

/** Loose schema for OpenAI structured output — all keys required, values may be null */
export const resumeFieldsSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  school: z.string().nullable(),
  major: z.string().nullable(),
  graduationYear: z.number().int().nullable(),
  linkedinUrl: z.string().nullable(),
});

export const handshakeRosterSchema = z.array(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
    school: z.string().nullable(),
    major: z.string().nullable(),
  }),
);

export type ResumeFieldsSchema = z.infer<typeof resumeFieldsSchema>;
export type HandshakeRosterSchema = z.infer<typeof handshakeRosterSchema>;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function findEmailInText(text: string): string | null {
  const match = text.match(EMAIL_RE);
  return match?.[0]?.toLowerCase() ?? null;
}

export function normalizeResumeFields(
  raw: ResumeFieldsSchema,
  resumeText: string,
): ResumeFields | null {
  const firstName = raw.firstName?.trim() || null;
  const lastName = raw.lastName?.trim() || null;
  const rawEmail = raw.email?.trim().toLowerCase() || null;
  const email =
    rawEmail && EMAIL_RE.test(rawEmail)
      ? rawEmail
      : findEmailInText(resumeText);

  if (!firstName && !lastName && !email) {
    return null;
  }

  return {
    firstName: firstName || "Unknown",
    lastName: lastName || "",
    email: email || "",
    phone: raw.phone?.trim() || null,
    location: raw.location?.trim() || null,
    school: raw.school?.trim() || null,
    major: raw.major?.trim() || null,
    graduationYear: raw.graduationYear ?? null,
    linkedinUrl: raw.linkedinUrl?.trim() || null,
  };
}
