import { describe, expect, test } from "bun:test";
import {
  emailConflictMessage,
  errorText,
  mapCandidateUniqueConstraint,
  parseUniqueConstraint,
} from "./unique-constraint";

describe("parseUniqueConstraint", () => {
  test("reads D1 candidate.email failures", () => {
    expect(
      parseUniqueConstraint(
        "D1_ERROR: UNIQUE constraint failed: candidate.email",
      ),
    ).toEqual({
      table: "candidate",
      columns: ["email"],
      raw: "candidate.email",
    });
  });

  test("strips SQLITE_CONSTRAINT suffix", () => {
    expect(
      parseUniqueConstraint(
        "D1_ERROR: UNIQUE constraint failed: candidate.email: SQLITE_CONSTRAINT",
      ),
    ).toEqual({
      table: "candidate",
      columns: ["email"],
      raw: "candidate.email",
    });
  });

  test("walks drizzle cause chains", () => {
    const cause = new Error(
      "D1_ERROR: UNIQUE constraint failed: candidate.email",
    );
    const wrapped = new Error("Failed query: insert into `candidate`");
    wrapped.cause = cause;

    expect(parseUniqueConstraint(errorText(wrapped))).toEqual({
      table: "candidate",
      columns: ["email"],
      raw: "candidate.email",
    });
  });

  test("reads composite application uniqueness", () => {
    expect(
      parseUniqueConstraint(
        "UNIQUE constraint failed: application.candidate_id, application.position_id",
      ),
    ).toEqual({
      table: "application",
      columns: ["candidate_id", "position_id"],
      raw: "application.candidate_id, application.position_id",
    });
  });

  test("reads index names when SQLite reports those", () => {
    expect(
      parseUniqueConstraint(
        "UNIQUE constraint failed: candidate_email_unique",
      ),
    ).toEqual({
      table: null,
      columns: [],
      raw: "candidate_email_unique",
    });
  });

  test("returns null for unrelated errors", () => {
    expect(parseUniqueConstraint("D1_ERROR: no such table")).toBe(null);
  });
});

describe("mapCandidateUniqueConstraint", () => {
  test("maps email uniqueness to a clear duplicate-email message", () => {
    expect(
      mapCandidateUniqueConstraint(
        "UNIQUE constraint failed: candidate.email",
      ),
    ).toEqual({
      code: "CANDIDATE_EMAIL_EXISTS",
      message:
        "A candidate with this email already exists. Each candidate must have a unique email.",
    });
  });

  test("maps position-link uniqueness", () => {
    expect(
      mapCandidateUniqueConstraint(
        "UNIQUE constraint failed: candidate_position.candidate_id, candidate_position.position_id",
      ),
    ).toEqual({
      code: "CANDIDATE_ALREADY_ON_POSITION",
      message: "This candidate is already assigned to that position.",
    });
  });

  test("maps unknown unique constraints without leaking SQL", () => {
    expect(
      mapCandidateUniqueConstraint(
        "UNIQUE constraint failed: side_effect_outbox.dedupe_key",
      ),
    ).toEqual({
      code: "CANDIDATE_DUPLICATE",
      message:
        "This candidate couldn't be saved because a matching record already exists.",
    });
  });

  test("returns null when the error is not a unique constraint", () => {
    expect(mapCandidateUniqueConstraint("boom")).toBe(null);
  });
});

describe("emailConflictMessage", () => {
  test("names the existing candidate", () => {
    expect(
      emailConflictMessage({ firstName: "Jane", lastName: "Doe" }),
    ).toBe(
      "A candidate named Jane Doe already uses this email. Each candidate must have a unique email — open the existing record instead.",
    );
  });
});
