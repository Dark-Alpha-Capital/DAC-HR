import type { HandshakeRosterEntry } from "../types";
import { extractHandshakeRosterWithOpenAI } from "./extract-resume-fields";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function parseNameEmailLine(line: string): HandshakeRosterEntry | null {
  const emails = line.match(EMAIL_REGEX);
  if (!emails?.[0]) {
    return null;
  }

  const email = emails[0].toLowerCase();
  const beforeEmail = line.slice(0, line.indexOf(email)).trim();
  const name = beforeEmail.replace(/[,|]/g, " ").replace(/\s+/g, " ").trim();
  if (!name || name.length < 2) {
    return null;
  }

  const parts = line.split(/[,|]/).map((p) => p.trim()).filter(Boolean);
  const school = parts.find(
    (p) => !p.includes("@") && p !== name && p.length > 3,
  );

  return {
    name,
    email,
    school: school ?? null,
    major: null,
  };
}

export function parseHandshakeRosterFromText(
  text: string,
): HandshakeRosterEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: HandshakeRosterEntry[] = [];
  const seenEmails = new Set<string>();

  for (const line of lines) {
    if (!line.includes("@")) {
      continue;
    }

    const entry = parseNameEmailLine(line);
    if (!entry || seenEmails.has(entry.email)) {
      continue;
    }

    seenEmails.add(entry.email);
    entries.push(entry);
  }

  return entries;
}

export async function extractHandshakeRoster(
  rosterText: string,
  apiKey?: string,
): Promise<HandshakeRosterEntry[]> {
  const heuristic = parseHandshakeRosterFromText(rosterText);
  if (heuristic.length >= 2) {
    return heuristic;
  }

  if (apiKey) {
    return extractHandshakeRosterWithOpenAI(rosterText, apiKey);
  }

  return heuristic;
}
