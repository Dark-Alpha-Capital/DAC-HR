import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
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

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString } from "#/lib/parse-search";

export function parseEmployeesSearch(search: Record<string, unknown>) {
  const memberType = search.memberType;
  const parsedMemberType: PrismicMemberFilter =
    memberType === "team" || memberType === "operating" ? memberType : "all";

  return {
    memberType: parsedMemberType,
    name: toOptionalString(search.name),
  };
}

export type EmployeesIndexSearch = ReturnType<typeof parseEmployeesSearch>;
export type PrismicMembersData = Awaited<ReturnType<typeof loadPrismicMembers>>;

export function prismicMembersQueryOptions(deps: EmployeesIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.prismic.members(deps),
    queryFn: async (): Promise<PrismicMembersData> =>
      loadPrismicMembers({ data: deps }),
    placeholderData: keepPreviousData,
  });
}

export function parseMemberSearch(search: Record<string, unknown>): {
  kind: PrismicMemberKind;
  memberType: PrismicMemberFilter;
  name: string | undefined;
} {
  const kind: PrismicMemberKind =
    search.kind === "operating" ? "operating" : "team";
  const memberType: PrismicMemberFilter =
    search.memberType === "team" || search.memberType === "operating"
      ? search.memberType
      : "all";

  return {
    kind,
    memberType,
    name: typeof search.name === "string" ? search.name : undefined,
  };
}

export function prismicMemberQueryOptions(uid: string, kind: PrismicMemberKind) {
  return queryOptions({
    queryKey: queryKeys.prismic.member(uid, kind),
    queryFn: () => loadPrismicMember({ data: { uid, kind } }),
  });
}
