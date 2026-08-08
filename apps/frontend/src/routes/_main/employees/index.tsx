import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import FilterEmployeeName from "~/components/filter-employee-name";
import { PrismicMemberTypeFilter } from "~/components/prismic-member-type-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  loadPrismicMembers,
  type PrismicMemberFilter,
} from "~/lib/loaders/prismic-members";
import type { PrismicMember } from "~/lib/prismic/member";
import { toOptionalString } from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

function parseEmployeesSearch(search: Record<string, unknown>) {
  const memberType = search.memberType;
  const parsedMemberType: PrismicMemberFilter =
    memberType === "team" || memberType === "operating" ? memberType : "all";

  return {
    memberType: parsedMemberType,
    name: toOptionalString(search.name),
  };
}

type EmployeesIndexSearch = ReturnType<typeof parseEmployeesSearch>;
type PrismicMembersData = Awaited<ReturnType<typeof loadPrismicMembers>>;

function getMemberInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function prismicMembersQueryOptions(deps: EmployeesIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.prismic.members(deps),
    queryFn: async (): Promise<PrismicMembersData> =>
      loadPrismicMembers({ data: deps }),
    placeholderData: keepPreviousData,
  });
}

export const Route = createFileRoute("/_main/employees/")({
  head: () => ({
    meta: [{ title: "Employees" }],
  }),
  validateSearch: parseEmployeesSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseEmployeesSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(prismicMembersQueryOptions(search));
  },
  pendingComponent: () => <ListPageSkeleton />,
  component: EmployeesPage,
});

function EmployeesPage() {
  const search = Route.useSearch();
  const {
    data,
    isLoading,
    isFetching,
    error,
  }: UseQueryResult<PrismicMembersData> = useQuery(
    prismicMembersQueryOptions(search),
  );

  if (isLoading && !data) {
    return <ListPageSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Could not load members."}
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { members, hasFilters } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>

      <div
        className="space-y-4 transition-opacity"
        style={{ opacity: isFetching ? 0.7 : 1 }}
      >
        <PrismicMemberTypeFilter
          current={search.memberType}
          name={search.name}
        />
        <FilterEmployeeName />
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No members found matching the selected filters."
              : "No members found."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member: PrismicMember, index) => (
              <TableRow
                key={member.id}
                className={member.uid ? "relative cursor-pointer" : undefined}
              >
                <TableCell className="text-muted-foreground tabular-nums">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 shrink-0">
                      {member.photoUrl ? (
                        <AvatarImage src={member.photoUrl} alt={member.name} />
                      ) : null}
                      <AvatarFallback>
                        {getMemberInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.title ?? "—"}
                </TableCell>
                {member.uid ? (
                  <Link
                    to="/employees/member/$uid"
                    params={{ uid: member.uid }}
                    search={{
                      kind: member.kind,
                      memberType: search.memberType,
                      name: search.name,
                    }}
                    className="absolute inset-0"
                    aria-label={`View ${member.name}`}
                  />
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
