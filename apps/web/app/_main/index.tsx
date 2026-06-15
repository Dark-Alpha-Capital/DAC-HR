import { Suspense, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Folders, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import HomeStatsCards from "@/components/home-stats-cards";
import HomeEmployeeStat from "@/components/home-employee-stat";

export const Route = createFileRoute("/_main/")({
  head: () => ({
    meta: [{ title: "DAC HR" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Manage recruiting, onboarding, and HR operations from one place.
        </p>
      </div>

      <Suspense fallback={<HomeLoading />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}

function HomeContent() {
  return (
    <div className="space-y-8">
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
              <Link to="/candidates/new" search="{}">
                <Users className="mr-2 size-4" />
                New candidate
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/positions/new" search="{}">
                <Briefcase className="mr-2 size-4" />
                New position
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/documents/new" search="{}">
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
                  <Link to="/positions" search={{} as any}>
                    Open
                  </Link>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">2. Add candidates</span>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/candidates" search="{}">
                    Open
                  </Link>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  3. Track applications and rounds
                </span>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/applications" search="{}">
                    Open
                  </Link>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  4. Prepare question bank
                </span>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/questions" search="{}">
                    Open
                  </Link>
                </Button>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickLink
          to="/candidates"
          title="Candidates"
          description="Search, filter, and manage profiles."
          icon={Users}
        />
        <QuickLink
          to="/positions"
          title="Positions"
          description="Open roles and role configuration."
          icon={Briefcase}
        />
        <QuickLink
          to="/applications"
          title="Applications"
          description="Pipeline status and progress."
          icon={FileText}
        />
        <QuickLink
          to="/documents"
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
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link to={to}>
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
