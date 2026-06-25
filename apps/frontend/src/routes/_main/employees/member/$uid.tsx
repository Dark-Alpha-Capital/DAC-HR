import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import BackButton from "~/components/back-button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { DetailPageSkeleton } from "~/components/route-skeletons/detail-page-skeleton";
import { loadPrismicMember } from "~/lib/loaders/prismic-members";
import type { PrismicMemberKind } from "~/lib/prismic/member";
import { queryKeys } from "~/lib/query/query-keys";

function parseMemberSearch(search: Record<string, unknown>) {
  return {
    kind: search.kind === "operating" ? "operating" : ("team" as const),
    memberType:
      search.memberType === "team" || search.memberType === "operating"
        ? search.memberType
        : ("all" as const),
    name: typeof search.name === "string" ? search.name : undefined,
  };
}

function prismicMemberQueryOptions(uid: string, kind: PrismicMemberKind) {
  return queryOptions({
    queryKey: queryKeys.prismic.member(uid, kind),
    queryFn: () => loadPrismicMember({ data: { uid, kind } }),
  });
}

export const Route = createFileRoute("/_main/employees/member/$uid")({
  head: () => ({
    meta: [{ title: "Employee" }],
  }),
  validateSearch: parseMemberSearch,
  loader: async ({ context: { queryClient }, params, location }) => {
    const { kind } = parseMemberSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(
      prismicMemberQueryOptions(params.uid, kind),
    );
  },
  component: PrismicMemberDetailPage,
});

function PrismicMemberDetailPage() {
  const { uid } = Route.useParams();
  const search = Route.useSearch();
  const { data, isLoading, error } = useQuery(
    prismicMemberQueryOptions(uid, search.kind),
  );

  if (isLoading && !data) {
    return <DetailPageSkeleton />;
  }

  if (error || !data?.member) {
    return (
      <div className="space-y-4">
        <BackButton />
        <p className="text-muted-foreground">Member not found.</p>
        <Button asChild variant="secondary" size="sm">
          <Link to="/employees" search={search}>
            Back to employees
          </Link>
        </Button>
      </div>
    );
  }

  const { member } = data;

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="flex items-start gap-4">
        <Avatar className="size-20">
          {member.photoUrl ? (
            <AvatarImage src={member.photoUrl} alt={member.name} />
          ) : null}
          <AvatarFallback className="text-lg">
            {member.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {member.name}
          </h1>
          {member.designation ? (
            <p className="text-muted-foreground">{member.designation}</p>
          ) : null}
          {member.department ? (
            <p className="text-muted-foreground text-sm">{member.department}</p>
          ) : null}
        </div>
      </div>

      {member.bio ? (
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed whitespace-pre-line">
          {member.bio}
        </p>
      ) : null}
    </div>
  );
}
