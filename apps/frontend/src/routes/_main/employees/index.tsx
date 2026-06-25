import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
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

function prismicMembersQueryOptions(deps: EmployeesIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.prismic.members(deps),
    queryFn: () => loadPrismicMembers({ data: deps }),
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
  component: EmployeesPage,
});

function EmployeesPage() {
  const search = Route.useSearch();
  const { data, isLoading, isFetching, error } = useQuery({
    ...prismicMembersQueryOptions(search),
    placeholderData: keepPreviousData,
  });

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
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member: PrismicMember) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {member.designation ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {member.uid ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link
                        to="/employees/member/$uid"
                        params={{ uid: member.uid }}
                        search={{
                          kind: member.kind,
                          memberType: search.memberType,
                          name: search.name,
                        }}
                      >
                        View
                      </Link>
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
