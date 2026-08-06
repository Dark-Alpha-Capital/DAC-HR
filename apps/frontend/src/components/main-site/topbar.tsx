import * as React from "react";
import { Link, useMatches } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { UserNav } from "~/components/user-nav";
import type { AppSession } from "~/lib/auth-session";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  candidates: "Candidates",
  applications: "Applications",
  documents: "Documents",
  employees: "Employees",
  positions: "Positions",
  rounds: "Rounds",
  interviews: "Interviews",
  questions: "Questions",
  profile: "Profile",
  admin: "Admin",
  docs: "Docs",
  "weekly-checkin": "Weekly check-in",
};

function isOpaqueId(segment: string) {
  return /^[0-9a-f-]{8,}$/i.test(segment);
}

function labelForSegment(segment: string) {
  const mapped = ROUTE_LABELS[segment];
  if (mapped) return mapped;
  if (isOpaqueId(segment)) return "Details";
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

const INTERVIEW_DETAIL_ROUTE_IDS = [
  "/_main/interviews/$id/",
  "/_main/interviews/bundle/$bundleId/",
] as const;

interface InterviewRouteLoaderData {
  application?: {
    id?: string;
    position?: { name?: string } | null;
  } | null;
}

export function MainSiteTopbar({ session }: { session: AppSession }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const matches = useMatches();
  const segments = React.useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname],
  );

  const first = segments[0];
  const second = segments[1];

  const primaryLabel = first ? labelForSegment(first) : "Home";
  const secondaryLabel = second ? labelForSegment(second) : undefined;

  const interviewMatch = matches.find((match) =>
    INTERVIEW_DETAIL_ROUTE_IDS.includes(
      match.id as (typeof INTERVIEW_DETAIL_ROUTE_IDS)[number],
    ),
  );
  const applicationData = interviewMatch?.loaderData as
    | InterviewRouteLoaderData
    | undefined;
  const applicationId = applicationData?.application?.id;
  const applicationLabel =
    applicationData?.application?.position?.name ?? "Application";

  return (
    <header className="sticky top-0 z-40 border-b bg-secondary/80 backdrop-blur supports-[backdrop-filter]:bg-secondary/70">
      <div className="flex h-12 items-center gap-2 px-3 md:px-4">
        <SidebarTrigger className="shrink-0 md:hidden" />
        <Separator orientation="vertical" className="h-6 md:hidden" />

        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="min-w-0">
            {interviewMatch ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  {applicationId ? (
                    <BreadcrumbLink asChild>
                      <Link to="/applications/$id" params={{ id: applicationId }}>
                        <span className="truncate">{applicationLabel}</span>
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to="/applications" search={{} as any}>
                        <span className="truncate">{applicationLabel}</span>
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            ) : (
              <>
                {!first ? (
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="truncate">Home</BreadcrumbPage>
                  </BreadcrumbItem>
                ) : (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/">Home</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                {secondaryLabel ? (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink href={`/${first}`}>
                        {primaryLabel}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="min-w-0">
                      <BreadcrumbPage className="truncate">
                        {secondaryLabel}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : (
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="truncate">
                      {primaryLabel}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto shrink-0">
          <UserNav session={session} />
        </div>
      </div>
    </header>
  );
}
