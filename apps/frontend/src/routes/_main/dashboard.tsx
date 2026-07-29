import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import DashboardStatsGrid from "~/components/dashboard-stats-grid";
import { loadDashboardStats } from "~/lib/loaders/dashboard";
import { queryKeys } from "~/lib/query/query-keys";
import {
  Briefcase,
  Building2,
  Calendar,
  CircleDot,
  ClipboardCheck,
  FileText,
  Folders,
  HelpCircle,
  ScanSearch,
  Users,
} from "lucide-react";
import { cn } from "~/lib/utils";

type DashboardStatsData = Awaited<ReturnType<typeof loadDashboardStats>>;

function dashboardStatsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardStatsData> => loadDashboardStats(),
    placeholderData: keepPreviousData,
  });
}

export const Route = createFileRoute("/_main/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard - DAC HR" }],
  }),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(dashboardStatsQueryOptions());
  },
  component: DashboardPage,
});

const quickActions = [
  {
    to: "/candidates/new",
    label: "New candidate",
    icon: Users,
    variant: "default" as const,
    search: {},
  },
  {
    to: "/positions/new",
    label: "New position",
    icon: Briefcase,
    variant: "secondary" as const,
    search: {},
  },
  {
    to: "/documents/new",
    label: "Upload document",
    icon: Folders,
    variant: "secondary" as const,
    search: {},
  },
  {
    to: "/applications",
    label: "View applications",
    icon: FileText,
    variant: "secondary" as const,
    search: {},
  },
  {
    to: "/interviews",
    label: "Interviews",
    icon: Calendar,
    variant: "secondary" as const,
    search: {},
  },
  {
    to: "/questions/new",
    label: "Add question",
    icon: HelpCircle,
    variant: "secondary" as const,
    search: {},
  },
  {
    to: "/rounds/new",
    label: "New round",
    icon: CircleDot,
    variant: "secondary" as const,
    search: {},
  },
  {
    to: "/screeners/new",
    label: "New screener",
    icon: ScanSearch,
    variant: "secondary" as const,
    search: {},
  },
  {
    to: "/weekly-checkin",
    label: "Weekly check-in",
    icon: ClipboardCheck,
    variant: "secondary" as const,
    search: {},
  },
] as const;

const accessTiles = [
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/positions", label: "Positions", icon: Briefcase },
  { to: "/documents", label: "Documents", icon: Folders },
  { to: "/interviews", label: "Interviews", icon: Calendar },
  { to: "/questions", label: "Questions", icon: HelpCircle },
  { to: "/rounds", label: "Rounds", icon: CircleDot },
  { to: "/screeners", label: "Screeners", icon: ScanSearch },
  { to: "/employees", label: "Employees", icon: Building2 },
  { to: "/weekly-checkin", label: "Check-in", icon: ClipboardCheck },
] as const;

function DashboardPage() {
  const { data: stats, isLoading }: UseQueryResult<DashboardStatsData> =
    useQuery(dashboardStatsQueryOptions());

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Recruiting pipeline, hiring metrics, and quick access to core workflows.
        </p>
      </div>

      {isLoading && !stats ? (
        <StatsGridSkeleton />
      ) : stats ? (
        <DashboardStatsGrid stats={stats} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription className="text-sm">
            Common tasks across recruiting and hiring.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.to}
                asChild
                size="sm"
                variant={action.variant}
                className="justify-start"
              >
                <Link to={action.to} search={action.search}>
                  <Icon className="mr-2 size-4" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Quick access
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
          {accessTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.to}
                to={tile.to}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border border-border/80 bg-card p-3 text-center transition-colors",
                  "hover:border-border hover:bg-muted/50",
                )}
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <span className="text-xs font-medium leading-tight">
                  {tile.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="mb-1 h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
