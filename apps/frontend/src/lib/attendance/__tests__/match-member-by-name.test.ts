import { expect, test } from "bun:test";
import {
  matchMemberByName,
  normalizeMemberName,
} from "~/lib/attendance/match-member-by-name";
import type { PrismicMember } from "~/lib/prismic/member";

function member(
  overrides: Partial<PrismicMember> & Pick<PrismicMember, "name" | "uid">,
): PrismicMember {
  return {
    id: overrides.id ?? "id",
    kind: overrides.kind ?? "team",
    level: null,
    designation: null,
    title: null,
    department: null,
    role: null,
    bio: null,
    photoUrl: null,
    linkedInUrl: null,
    phoneNumber: null,
    resumeUrl: null,
    calendlyUrl: null,
    ...overrides,
  };
}

test("normalizeMemberName collapses whitespace and lowercases", () => {
  expect(normalizeMemberName("  Jack   Nicholson ")).toBe("jack nicholson");
});

test("matchMemberByName returns exact case-insensitive match", () => {
  const members = [
    member({ uid: "jack-nicholson", name: "Jack Nicholson" }),
    member({ uid: "jane-doe", name: "Jane Doe" }),
  ];

  const result = matchMemberByName(members, "jack nicholson");
  expect(result.status).toBe("matched");
  if (result.status === "matched") {
    expect(result.member.uid).toBe("jack-nicholson");
  }
});

test("matchMemberByName returns not_found for unknown names", () => {
  const result = matchMemberByName(
    [member({ uid: "jane-doe", name: "Jane Doe" })],
    "Jack Nicholson",
  );
  expect(result.status).toBe("not_found");
});

test("matchMemberByName returns ambiguous when multiple uids share a name", () => {
  const result = matchMemberByName(
    [
      member({ uid: "jack-1", name: "Jack Nicholson", kind: "team" }),
      member({ uid: "jack-2", name: "Jack Nicholson", kind: "operating" }),
    ],
    "Jack Nicholson",
  );
  expect(result.status).toBe("ambiguous");
  if (result.status === "ambiguous") {
    expect(result.matches).toHaveLength(2);
  }
});

test("matchMemberByName ignores members without uid", () => {
  const result = matchMemberByName(
    [member({ uid: null, name: "Jack Nicholson" })],
    "Jack Nicholson",
  );
  expect(result.status).toBe("not_found");
});
