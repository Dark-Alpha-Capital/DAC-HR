import type { PrismicMember } from "~/lib/prismic/member";

export function normalizeMemberName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export type MemberNameMatch =
  | { status: "matched"; member: PrismicMember & { uid: string } }
  | { status: "not_found" }
  | {
      status: "ambiguous";
      matches: Array<PrismicMember & { uid: string }>;
    };

export function matchMemberByName(
  members: PrismicMember[],
  name: string,
): MemberNameMatch {
  const normalized = normalizeMemberName(name);
  if (!normalized) return { status: "not_found" };

  const matches = members.filter(
    (member): member is PrismicMember & { uid: string } =>
      member.uid !== null &&
      normalizeMemberName(member.name) === normalized,
  );

  if (matches.length === 0) return { status: "not_found" };
  if (matches.length > 1) return { status: "ambiguous", matches };
  return { status: "matched", member: matches[0]! };
}
