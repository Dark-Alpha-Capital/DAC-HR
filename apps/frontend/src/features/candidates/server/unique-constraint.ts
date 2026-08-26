export type CandidateConflictCode =
  | "CANDIDATE_EMAIL_EXISTS"
  | "CANDIDATE_ALREADY_ON_POSITION"
  | "CANDIDATE_DUPLICATE";

export type UniqueConstraint = {
  table: string | null;
  columns: string[];
  raw: string;
};

export class CandidateConflictError extends Error {
  readonly code: CandidateConflictCode;
  readonly existingCandidateId?: string;

  constructor(
    message: string,
    options?: {
      code?: CandidateConflictCode;
      existingCandidateId?: string;
    },
  ) {
    super(message);
    this.name = "CandidateConflictError";
    this.code = options?.code ?? "CANDIDATE_DUPLICATE";
    this.existingCandidateId = options?.existingCandidateId;
  }
}

function extraCauseText(cause: unknown): string {
  if (cause instanceof Error) return errorText(cause);
  if (cause == null) return "";
  return String(cause);
}

export function errorText(error: Error): string {
  return [error.name, error.message, extraCauseText(error.cause)]
    .filter(Boolean)
    .join("\n");
}

const UNIQUE_CONSTRAINT_RE = /UNIQUE constraint failed:\s*([^\n]+)/i;

export function parseUniqueConstraint(text: string): UniqueConstraint | null {
  const match = UNIQUE_CONSTRAINT_RE.exec(text);
  if (!match?.[1]) return null;

  const raw = match[1]
    .replace(/\s*: SQLITE_CONSTRAINT.*$/i, "")
    .trim();
  if (!raw) return null;

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const onlyPart = parts[0];

  if (parts.length === 1 && onlyPart && !onlyPart.includes(".")) {
    return { table: null, columns: [], raw: onlyPart };
  }

  const columns: string[] = [];
  let table: string | null = null;
  for (const part of parts) {
    const dot = part.lastIndexOf(".");
    if (dot === -1) {
      columns.push(part);
      continue;
    }
    table ??= part.slice(0, dot);
    columns.push(part.slice(dot + 1));
  }

  return { table, columns, raw };
}

function isEmailUnique(parsed: UniqueConstraint): boolean {
  if (parsed.raw === "candidate_email_unique") return true;
  return parsed.table === "candidate" && parsed.columns.includes("email");
}

function isPositionLinkUnique(parsed: UniqueConstraint): boolean {
  if (
    parsed.raw === "app_candidate_position_unique" ||
    parsed.raw === "candidate_position_unique"
  ) {
    return true;
  }
  return (
    (parsed.table === "application" || parsed.table === "candidate_position") &&
    parsed.columns.includes("candidate_id") &&
    parsed.columns.includes("position_id")
  );
}

export function mapCandidateUniqueConstraint(text: string): {
  code: CandidateConflictCode;
  message: string;
} | null {
  const parsed = parseUniqueConstraint(text);
  if (!parsed) return null;

  if (isEmailUnique(parsed)) {
    return {
      code: "CANDIDATE_EMAIL_EXISTS",
      message:
        "A candidate with this email already exists. Each candidate must have a unique email.",
    };
  }

  if (isPositionLinkUnique(parsed)) {
    return {
      code: "CANDIDATE_ALREADY_ON_POSITION",
      message: "This candidate is already assigned to that position.",
    };
  }

  return {
    code: "CANDIDATE_DUPLICATE",
    message:
      "This candidate couldn't be saved because a matching record already exists.",
  };
}

export function emailConflictMessage(existing: {
  firstName: string;
  lastName: string;
}): string {
  return `A candidate named ${existing.firstName} ${existing.lastName} already uses this email. Each candidate must have a unique email — open the existing record instead.`;
}
