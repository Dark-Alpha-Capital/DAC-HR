import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { createPrismicClient } from "#/features/docs/client";
import {
  getOperatingMemberType,
  getTeamMemberType,
} from "#/features/docs/config";
import {
  toPrismicMember,
  type PrismicMember,
  type PrismicMemberKind,
} from "#/features/docs/member";

export type PrismicMemberFilter = "all" | PrismicMemberKind;
export type { PrismicMemberKind };

type PrismicMembersInput = {
  memberType?: PrismicMemberFilter;
  name?: string;
};

const ordering = [
  { field: "document.first_publication_date", direction: "asc" as const },
];

export const loadPrismicMembers = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: PrismicMembersInput) => data)
  .handler(async ({ data }) => {
    const client = createPrismicClient();
    const teamType = getTeamMemberType();
    const operatingType = getOperatingMemberType();
    const filter = data.memberType ?? "all";

    const fetches: Promise<PrismicMember[]>[] = [];

    if (filter === "all" || filter === "team") {
      fetches.push(
        client
          .getAllByType(teamType, { orderings: ordering })
          .then((docs) => docs.map((doc) => toPrismicMember(doc, "team"))),
      );
    }

    if (filter === "all" || filter === "operating") {
      fetches.push(
        client
          .getAllByType(operatingType, { orderings: ordering })
          .then((docs) =>
            docs.map((doc) => toPrismicMember(doc, "operating")),
          ),
      );
    }

    const members = (await Promise.all(fetches)).flat();

    const nameQuery = data.name?.trim().toLowerCase();
    const filtered = nameQuery
      ? members.filter((member) =>
          member.name.toLowerCase().includes(nameQuery),
        )
      : members;

    return {
      members: filtered,
      memberType: filter,
      hasFilters: Boolean(nameQuery || filter !== "all"),
    };
  });

type PrismicMemberDetailInput = {
  uid: string;
  kind: PrismicMemberKind;
};

export const loadPrismicMember = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: PrismicMemberDetailInput) => data)
  .handler(async ({ data }) => {
    const client = createPrismicClient();
    const type =
      data.kind === "team" ? getTeamMemberType() : getOperatingMemberType();
    const document = await client.getByUID(type, data.uid);

    return {
      member: toPrismicMember(document, data.kind),
    };
  });
