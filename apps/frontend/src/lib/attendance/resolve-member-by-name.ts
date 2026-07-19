import { createPrismicClient } from "~/lib/prismic/client";
import {
  getOperatingMemberType,
  getTeamMemberType,
} from "~/lib/prismic/config";
import {
  toPrismicMember,
  type PrismicMember,
} from "~/lib/prismic/member";

const ordering = [
  { field: "document.first_publication_date", direction: "asc" as const },
];

export {
  matchMemberByName,
  normalizeMemberName,
  type MemberNameMatch,
} from "~/lib/attendance/match-member-by-name";

export async function loadAllPrismicMembers(): Promise<PrismicMember[]> {
  const client = createPrismicClient();
  const [teamDocs, operatingDocs] = await Promise.all([
    client
      .getAllByType(getTeamMemberType(), { orderings: ordering })
      .then((docs) => docs.map((doc) => toPrismicMember(doc, "team"))),
    client
      .getAllByType(getOperatingMemberType(), { orderings: ordering })
      .then((docs) => docs.map((doc) => toPrismicMember(doc, "operating"))),
  ]);

  return [...teamDocs, ...operatingDocs];
}
