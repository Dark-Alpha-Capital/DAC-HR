import { test, expect } from "bun:test";
import {
  substituteTemplate,
  EMAIL_TEMPLATE_VARIABLES,
  DEFAULT_INTERVIEW_INVITE_TEMPLATE,
} from "./template-utils";

const values = {
  candidateName: "Jane Doe",
  positionName: "Analyst",
  link: "https://recruiting.darkalphacapital.com/interview/abc123",
  expiresAt: "August 10, 2026 at 12:00 PM",
};

test("substituteTemplate replaces every known placeholder", () => {
  const input =
    "Hi {candidateName}, join {positionName} via {link} before {expiresAt}.";
  expect(substituteTemplate(input, values)).toBe(
    "Hi Jane Doe, join Analyst via https://recruiting.darkalphacapital.com/interview/abc123 before August 10, 2026 at 12:00 PM.",
  );
});

test("substituteTemplate replaces repeated placeholders", () => {
  const input = "{candidateName} — {candidateName} — {positionName}";
  expect(substituteTemplate(input, values)).toBe("Jane Doe — Jane Doe — Analyst");
});

test("substituteTemplate leaves unknown tokens untouched", () => {
  const input = "Hello {candidateName}, typo token {candidateNmae} stays";
  expect(substituteTemplate(input, values)).toBe(
    "Hello Jane Doe, typo token {candidateNmae} stays",
  );
});

test("substituteTemplate handles empty template", () => {
  expect(substituteTemplate("", values)).toBe("");
});

test("EMAIL_TEMPLATE_VARIABLES covers every substitute token", () => {
  const tokens = EMAIL_TEMPLATE_VARIABLES.map((v) => v.token).sort();
  expect(tokens).toEqual(
    [
      "{candidateName}",
      "{expiresAt}",
      "{link}",
      "{positionName}",
    ].sort(),
  );
});

test("DEFAULT_INTERVIEW_INVITE_TEMPLATE substitutes cleanly", () => {
  const subject = substituteTemplate(
    DEFAULT_INTERVIEW_INVITE_TEMPLATE.subjectTemplate,
    values,
  );
  const body = substituteTemplate(
    DEFAULT_INTERVIEW_INVITE_TEMPLATE.bodyTemplate,
    values,
  );
  expect(subject).toBe("Interview invitation — Analyst");
  expect(body).toContain("Analyst");
  expect(body).toContain("August 10, 2026 at 12:00 PM");
});
