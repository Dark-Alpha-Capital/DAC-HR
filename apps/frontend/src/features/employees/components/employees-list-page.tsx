import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { Link, useSearch } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import FilterEmployeeName from "#/features/employees/components/filter-employee-name";
import { PrismicMemberTypeFilter } from "#/features/employees/components/prismic-member-type-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import {
  prismicMembersQueryOptions,
  type PrismicMembersData,
} from "#/features/docs/query-options";
import type { PrismicMember } from "#/features/docs/member";

function getMemberInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function EmployeesListPage() {
  const search = useSearch({ from: "/_main/employees/" });
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
