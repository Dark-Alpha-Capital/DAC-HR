"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";

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

export function MainSiteTopbar() {
  const pathname = usePathname();
  const segments = React.useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname],
  );

  const first = segments[0];
  const second = segments[1];

  const primaryLabel = first ? labelForSegment(first) : "Home";
  const secondaryLabel = second ? labelForSegment(second) : undefined;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-12 items-center gap-2 px-3 md:px-4">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="h-6" />

        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="min-w-0">
            {!first ? (
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">Home</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            {secondaryLabel ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/${first}` as Route}>{primaryLabel}</Link>
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
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
