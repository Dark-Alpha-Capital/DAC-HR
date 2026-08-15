import {
  loadPrismicMembers,
  loadPrismicMember,
} from "./server/queries/members";
import type { PrismicMemberFilter } from "./server/queries/members";
export type { PrismicMemberFilter };
import type { PrismicMemberKind } from "./member";

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString } from "#/lib/parse-search";

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toOptionalString or a memberType/kind check.
interface EmployeesSearchInput {
  memberType?: unknown;
  name?: unknown;
}

export function parseEmployeesSearch(search: EmployeesSearchInput) {
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

interface MemberSearchInput {
  kind?: unknown;
  memberType?: unknown;
  name?: unknown;
}

export function parseMemberSearch(search: MemberSearchInput) {
  const kind: PrismicMemberKind =
    search.kind === "operating" ? "operating" : "team";
  const memberType: PrismicMemberFilter =
    search.memberType === "team" || search.memberType === "operating"
      ? search.memberType
      : "all";

  return {
    kind,
    memberType,
    name: toOptionalString(search.name),
  };
}

export function prismicMemberQueryOptions(
  uid: string,
  kind: PrismicMemberKind,
) {
  return queryOptions({
    queryKey: queryKeys.prismic.member(uid, kind),
    queryFn: () => loadPrismicMember({ data: { uid, kind } }),
  });
}
