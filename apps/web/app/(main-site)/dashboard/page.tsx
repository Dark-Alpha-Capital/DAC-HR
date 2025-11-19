import React, { Suspense } from "react";
import {
  getDashboardStats,
  getCandidatesByStatus,
  getCandidatesByPosition,
  getUpcomingInterviews,
  getRecentActivity,
} from "@workspace/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRight,
  FileText,
  UserPlus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  CandidatesByStatusChart,
  CandidatesByPositionChart,
} from "@/components/dashboard-charts";

async function DashboardContent() {
  const [
    stats,
    candidatesByStatus,
    candidatesByPosition,
    upcomingInterviews,
    recentActivity,
  ] = await Promise.all([
    getDashboardStats(),
    getCandidatesByStatus(),
    getCandidatesByPosition(),
    getUpcomingInterviews(5),
    getRecentActivity(10),
  ]);

  // Calculate percentage changes (mock data for now - you'd calculate from historical data)
  const percentageChanges = {
    totalCandidates: 12,
    activeCandidates: 8,
    avgTimeToHire: -5,
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your hiring pipeline and recent activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Candidates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Candidates
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">
                {percentageChanges.totalCandidates}%
              </span>
              <span className="text-xs text-muted-foreground">
                from last month
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Active Candidates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Candidates
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeCandidates}</div>
            <p className="text-xs text-muted-foreground mt-1">In pipeline</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">
                {percentageChanges.activeCandidates}%
              </span>
              <span className="text-xs text-muted-foreground">
                from last month
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Interviews Scheduled */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interviews Scheduled
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.interviewsScheduled}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
          </CardContent>
        </Card>

        {/* Avg. Time to Hire */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Time to Hire
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgTimeToHire} days</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
              <span className="text-xs font-medium text-red-600">
                {Math.abs(percentageChanges.avgTimeToHire)}%
              </span>
              <span className="text-xs text-muted-foreground">
                from last month
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidates by Status - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Candidates by Status</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution across hiring pipeline
            </p>
          </CardHeader>
          <CardContent>
            <CandidatesByStatusChart data={candidatesByStatus} />
          </CardContent>
        </Card>

        {/* Candidates by Position - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Candidates by Position</CardTitle>
            <p className="text-sm text-muted-foreground">
              Open positions and candidate count
            </p>
          </CardHeader>
          <CardContent>
            <CandidatesByPositionChart data={candidatesByPosition} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Interviews and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Interviews</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Next {upcomingInterviews.length} scheduled interviews
                </p>
              </div>
              <Link
                href="/candidates"
                className="text-sm font-medium flex items-center gap-1 hover:underline"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingInterviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming interviews</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {interview.candidate.firstName}{" "}
                        {interview.candidate.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {interview.roundTemplate.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {interview.position.name}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {interview.scheduledAt
                          ? formatDate(interview.scheduledAt)
                          : "TBD"}
                      </p>
                      {interview.interviewer && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {interview.interviewer.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Latest updates across all candidates
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {activity.type === "application" ? (
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                          {activity.candidate.firstName[0]}
                          {activity.candidate.lastName[0]}
                        </span>
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-300">
                          {activity.candidate.firstName[0]}
                          {activity.candidate.lastName[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {activity.candidate.firstName}{" "}
                          {activity.candidate.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type === "application"
                            ? `Status changed to ${activity.status}`
                            : `${activity.roundName} ${activity.status === "move_forward" ? "moved forward" : activity.status === "rejected" ? "rejected" : "pending"}`}
                        </p>
                        {activity.user && (
                          <p className="text-xs text-muted-foreground">
                            {activity.user.name} •{" "}
                            {formatDistance(activity.timestamp)}
                          </p>
                        )}
                        {!activity.user && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistance(activity.timestamp)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {activity.type === "application" ? (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-gray-200 rounded"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// Helper function to format relative time
function formatDistance(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
}
