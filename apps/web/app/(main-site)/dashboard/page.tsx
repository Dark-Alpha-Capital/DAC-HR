import React, { Suspense } from "react";
import {
  getDashboardStats,
  getCandidatesByStatus,
  getCandidatesByPosition,
  getUpcomingInterviews,
  getRecentActivity,
  getApplicationsOverTime,
  getEmployeesByDepartment,
  getInterviewRatingsDistribution,
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
  TrendingDown,
  Calendar,
  Clock,
  ArrowRight,
  FileText,
  UserPlus,
  Briefcase,
  CheckCircle2,
  Star,
  BarChart3,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  CandidatesByStatusChart,
  CandidatesByPositionChart,
  ApplicationsOverTimeChart,
  EmployeesByDepartmentChart,
  InterviewRatingsChart,
} from "@/components/dashboard-charts";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
};

// Helper function to format percentage change
function PercentageChange({ value }: { value: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-green-600" : "text-red-600";

  return (
    <div className="flex items-center gap-1 mt-2">
      <Icon className={`h-3 w-3 ${colorClass}`} />
      <span className={`text-xs font-medium ${colorClass}`}>
        {Math.abs(value)}%
      </span>
      <span className="text-xs text-muted-foreground">from last month</span>
    </div>
  );
}

// Stats Cards Component
async function StatsCards() {
  const stats = await getDashboardStats();

  return (
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
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalCandidatesThisMonth} this month
          </p>
          <PercentageChange value={stats.totalCandidatesChange} />
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
          <PercentageChange value={stats.activeCandidatesChange} />
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
          <div className="text-3xl font-bold">{stats.interviewsScheduled}</div>
          <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
          {stats.totalInterviews > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {stats.completedInterviews} completed
            </p>
          )}
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
          {stats.avgTimeToHireChange !== 0 && (
            <div className="flex items-center gap-1 mt-2">
              {stats.avgTimeToHireChange < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-600">
                    {Math.abs(stats.avgTimeToHireChange)}% faster
                  </span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                  <span className="text-xs font-medium text-red-600">
                    {stats.avgTimeToHireChange}% slower
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">
                vs last month
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Additional Stats Cards Row
async function AdditionalStatsCards() {
  const stats = await getDashboardStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Employees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Employees
          </CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalEmployees}</div>
          <p className="text-xs text-muted-foreground mt-1">All employees</p>
        </CardContent>
      </Card>

      {/* Total Positions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Open Positions
          </CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalPositions}</div>
          <p className="text-xs text-muted-foreground mt-1">Active positions</p>
        </CardContent>
      </Card>

      {/* Applications This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Applications This Month
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.applicationsThisMonth}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          <PercentageChange value={stats.applicationsChange} />
        </CardContent>
      </Card>

      {/* Hired This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Hired This Month
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.hiredThisMonth}</div>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          <PercentageChange value={stats.hiredChange} />
        </CardContent>
      </Card>
    </div>
  );
}

// Interview Stats Cards
async function InterviewStatsCards() {
  const stats = await getDashboardStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Interview Completion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Interview Completion Rate
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.interviewCompletionRate}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.completedInterviews} of {stats.totalInterviews} completed
          </p>
        </CardContent>
      </Card>

      {/* Average Interview Rating */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Interview Rating
          </CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.avgInterviewRating > 0
              ? `${stats.avgInterviewRating.toFixed(1)}/5`
              : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.completedInterviews > 0
              ? "Based on completed interviews"
              : "No ratings yet"}
          </p>
        </CardContent>
      </Card>

      {/* Total Interviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Interviews
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalInterviews}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.interviewsScheduled} pending, {stats.completedInterviews}{" "}
            completed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Candidates by Status Chart Component
async function CandidatesByStatusSection() {
  const candidatesByStatus = await getCandidatesByStatus();

  return (
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
  );
}

// Candidates by Position Chart Component
async function CandidatesByPositionSection() {
  const candidatesByPosition = await getCandidatesByPosition();

  return (
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
  );
}

// Applications Over Time Chart Component
async function ApplicationsOverTimeSection() {
  const applicationsOverTime = await getApplicationsOverTime();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Application trends over the last 6 months
        </p>
      </CardHeader>
      <CardContent>
        {applicationsOverTime.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No application data available</p>
          </div>
        ) : (
          <ApplicationsOverTimeChart data={applicationsOverTime} />
        )}
      </CardContent>
    </Card>
  );
}

// Employees by Department Chart Component
async function EmployeesByDepartmentSection() {
  const employeesByDepartment = await getEmployeesByDepartment();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees by Department</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of employees across departments
        </p>
      </CardHeader>
    </Card>
  );
}

// Interview Ratings Chart Component
async function InterviewRatingsSection() {
  const interviewRatings = await getInterviewRatingsDistribution();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Ratings Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of interview ratings (1-5 stars)
        </p>
      </CardHeader>
      <CardContent>
        {interviewRatings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No interview ratings available</p>
          </div>
        ) : (
          <InterviewRatingsChart data={interviewRatings} />
        )}
      </CardContent>
    </Card>
  );
}

// Upcoming Interviews Component
async function UpcomingInterviewsSection() {
  const upcomingInterviews = await getUpcomingInterviews(5);

  return (
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
  );
}

// Recent Activity Component
async function RecentActivitySection() {
  const recentActivity = await getRecentActivity(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Latest updates across all candidates
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            recentActivity.map((activity) => (
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive overview of your hiring pipeline and organizational
          metrics
        </p>
      </div>

      {/* Primary Stats Cards */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Additional Stats Cards */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <AdditionalStatsCards />
      </Suspense>

      {/* Interview Stats Cards */}
      <Suspense fallback={<InterviewStatsSkeleton />}>
        <InterviewStatsCards />
      </Suspense>

      {/* Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <CandidatesByStatusSection />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <CandidatesByPositionSection />
        </Suspense>
      </div>

      {/* Charts Section - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <ApplicationsOverTimeSection />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <EmployeesByDepartmentSection />
        </Suspense>
      </div>

      {/* Charts Section - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <InterviewRatingsSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <UpcomingInterviewsSection />
        </Suspense>
      </div>

      {/* Recent Activity */}
      <Suspense fallback={<CardSkeleton />}>
        <RecentActivitySection />
      </Suspense>
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

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InterviewStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-40"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </CardContent>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </CardContent>
    </Card>
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
