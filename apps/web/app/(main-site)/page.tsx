import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Briefcase,
  FileText,
  Folders,
  HelpCircle,
  Calendar,
  Users,
} from "lucide-react";
import HomeStatsCards from "@/components/home-stats-cards";
import HomeEmployeeStat from "@/components/home-employee-stat";
import { Skeleton } from "@workspace/ui/components/skeleton";

export const metadata: Metadata = {
  title: "DAC HR",
  description: "HR Automation Platform",
};

export default async function Page() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <UserContent />
    </Suspense>
  );
}

async function UserContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  console.log("inside user content page");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {session.user.name ?? "there"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage recruiting, onboarding, and HR operations from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Suspense fallback={<StatsCardSkeleton />}>
          <HomeStatsCards />
        </Suspense>
        <Suspense fallback={<StatsCardSkeleton />}>
          <HomeEmployeeStat />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription className="text-sm">
              Create and manage core entities.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/candidates/new">
                <Users className="mr-2 size-4" />
                New candidate
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/positions/new">
                <Briefcase className="mr-2 size-4" />
                New position
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/documents/new">
                <Folders className="mr-2 size-4" />
                Upload document
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Getting started</CardTitle>
            <CardDescription className="text-sm">
              A minimal workflow for new roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  1. Create a position
                </span>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/positions">Open</Link>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">2. Add candidates</span>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/candidates">Open</Link>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  3. Track applications and rounds
                </span>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/applications">Open</Link>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  4. Prepare question bank
                </span>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/questions">Open</Link>
                </Button>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickLink
          href="/candidates"
          title="Candidates"
          description="Search, filter, and manage profiles."
          icon={Users}
        />
        <QuickLink
          href="/positions"
          title="Positions"
          description="Open roles and role configuration."
          icon={Briefcase}
        />
        <QuickLink
          href="/applications"
          title="Applications"
          description="Pipeline status and progress."
          icon={FileText}
        />
        <QuickLink
          href="/documents"
          title="Documents"
          description="Templates, uploads, and storage."
          icon={Folders}
        />
      </div>
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function HomeLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-36" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: Route;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-sm border-border/80">
        <CardHeader className="gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
