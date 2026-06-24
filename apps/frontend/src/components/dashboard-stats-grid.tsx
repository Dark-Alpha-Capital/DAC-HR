import { getDashboardStats } from "@workspace/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "~/lib/utils";

function StatChange({
  value,
  invert = false,
}: {
  value: number;
  invert?: boolean;
}) {
  if (value === 0) {
    return (
      <span className="text-xs text-muted-foreground">No change vs last month</span>
    );
  }

  const isGood = invert ? value < 0 : value > 0;
  const isBad = invert ? value > 0 : value < 0;

  return (
    <span
      className={cn(
        "text-xs",
        isGood && "text-emerald-600 dark:text-emerald-400",
        isBad && "text-red-600 dark:text-red-400",
        !isGood && !isBad && "text-muted-foreground",
      )}
    >
      {value > 0 ? "+" : ""}
      {value}% vs last month
    </span>
  );
}

export default async function DashboardStatsGrid() {
  const stats = await getDashboardStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCandidates}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.activeCandidates} active in pipeline
          </p>
          <StatChange value={stats.totalCandidatesChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Applications</CardTitle>
          <FileText className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.applicationsThisMonth}</div>
          <p className="mt-1 text-xs text-muted-foreground">This month</p>
          <StatChange value={stats.applicationsChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Hired</CardTitle>
          <UserCheck className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.hiredThisMonth}</div>
          <p className="mt-1 text-xs text-muted-foreground">Onboarded this month</p>
          <StatChange value={stats.hiredChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg. Time to Hire</CardTitle>
          <Clock className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.avgTimeToHire > 0 ? `${stats.avgTimeToHire}d` : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Application to onboarding
          </p>
          {stats.avgTimeToHire > 0 && (
            <StatChange value={stats.avgTimeToHireChange} invert />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Interviews</CardTitle>
          <Calendar className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.interviewsScheduled}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.completedInterviews} completed · {stats.interviewCompletionRate}%
            completion
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Interview Rating</CardTitle>
          <Star className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.avgInterviewRating > 0 ? stats.avgInterviewRating : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Average across rated interviews
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          <Briefcase className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPositions}</div>
          <p className="mt-1 text-xs text-muted-foreground">Active job positions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Employees</CardTitle>
          <UserCheck className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          <p className="mt-1 text-xs text-muted-foreground">Total headcount</p>
        </CardContent>
      </Card>
    </div>
  );
}
