import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Phone,
} from "lucide-react";
import type { ReactNode } from "react";
import BackButton from "~/components/back-button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DetailPageSkeleton } from "~/components/route-skeletons/detail-page-skeleton";
import {
  loadPrismicMember,
  type PrismicMemberFilter,
} from "~/lib/loaders/prismic-members";
import type { PrismicMemberKind } from "~/lib/prismic/member";
import { queryKeys } from "~/lib/query/query-keys";

const NOT_SPECIFIED = "Not specified";

function parseMemberSearch(search: Record<string, unknown>): {
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

function prismicMemberQueryOptions(uid: string, kind: PrismicMemberKind) {
  return queryOptions({
    queryKey: queryKeys.prismic.member(uid, kind),
    queryFn: () => loadPrismicMember({ data: { uid, kind } }),
  });
}

function getMemberInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ExternalValueLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground break-all underline transition-colors"
    >
      {href}
    </a>
  );
}

function OptionalValue({
  value,
  render,
}: {
  value: string | null;
  render?: (value: string) => ReactNode;
}) {
  if (!value) {
    return <span className="text-muted-foreground">{NOT_SPECIFIED}</span>;
  }
  return <>{render ? render(value) : value}</>;
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

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

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
  const kindLabel =
    member.kind === "operating" ? "Operating Partner" : "Team Member";
  const titleLabel = member.kind === "operating" ? "Designation" : "Level";
  const titleValue =
    member.kind === "operating"
      ? member.designation ?? member.title
      : member.level ?? member.title;

  return (
    <div className="space-y-8">
      <BackButton />

      <div className="flex items-start gap-4 border-b pb-6">
        <Avatar className="size-20">
          {member.photoUrl ? (
            <AvatarImage src={member.photoUrl} alt={member.name} />
          ) : null}
          <AvatarFallback className="text-lg">
            {getMemberInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {member.name}
          </h1>
          {titleValue ? (
            <p className="text-muted-foreground">{titleValue}</p>
          ) : null}
          <Badge variant="secondary">{kindLabel}</Badge>
        </div>
      </div>

      <section className="space-y-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Details
        </h2>

        <DetailRow icon={<Briefcase className="size-4" />} label={titleLabel}>
          <OptionalValue value={titleValue} />
        </DetailRow>

        {member.kind === "team" ? (
          <DetailRow
            icon={<Building2 className="size-4" />}
            label="Department"
          >
            <OptionalValue value={member.department} />
          </DetailRow>
        ) : null}

        <DetailRow icon={<Phone className="size-4" />} label="Phone Number">
          <OptionalValue
            value={member.phoneNumber}
            render={(phone) => (
              <a
                href={`tel:${phone}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {phone}
              </a>
            )}
          />
        </DetailRow>

        <DetailRow icon={<ExternalLink className="size-4" />} label="LinkedIn">
          <OptionalValue
            value={member.linkedInUrl}
            render={(href) => <ExternalValueLink href={href} />}
          />
        </DetailRow>

        <DetailRow icon={<FileText className="size-4" />} label="Resume">
          <OptionalValue
            value={member.resumeUrl}
            render={(href) => <ExternalValueLink href={href} />}
          />
        </DetailRow>

        <DetailRow icon={<Calendar className="size-4" />} label="Calendly Link">
          <OptionalValue
            value={member.calendlyUrl}
            render={(href) => <ExternalValueLink href={href} />}
          />
        </DetailRow>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4" />
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Description
          </h2>
        </div>
        <OptionalValue
          value={member.bio}
          render={(bio) => (
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed whitespace-pre-line">
              {bio}
            </p>
          )}
        />
      </section>
    </div>
  );
}
