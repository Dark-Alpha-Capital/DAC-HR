import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Users,
  Briefcase,
  FileText,
  ClipboardList,
  BookOpen,
  FolderOpen,
  HelpCircle,
  UserCheck,
  Calendar,
  ArrowRight,
} from "lucide-react";
import HomeStatsCards from "@/components/home-stats-cards";
import HomeEmployeeStat from "@/components/home-employee-stat";

export const metadata: Metadata = {
  title: "DAC HR",
  description: "HR Automation Platform",
};

export default async function Page() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <UserContent />
      </Suspense>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Suspense fallback={<StatsCardSkeleton />}>
          <HomeStatsCards />
        </Suspense>
        <Suspense fallback={<StatsCardSkeleton />}>
          <HomeEmployeeStat />
        </Suspense>
      </div>
    </div>
  );
}

async function UserContent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const features = [
    {
      title: "Dashboard",
      description:
        "View hiring pipeline overview, statistics, and recent activity",
      href: "/dashboard",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900",
    },
    {
      title: "Candidates",
      description: "Manage candidate profiles, applications, and documents",
      href: "/candidates",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
    {
      title: "Employees",
      description: "Manage employee records, departments, and positions",
      href: "/employees",
      icon: UserCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900",
    },
    {
      title: "Positions",
      description: "Create and manage job positions and openings",
      href: "/positions",
      icon: Briefcase,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900",
    },
    {
      title: "Applications",
      description: "Track candidate applications and their status",
      href: "/applications",
      icon: ClipboardList,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900",
    },
    {
      title: "Interviews",
      description: "Schedule and manage interview rounds",
      href: "/rounds",
      icon: Calendar,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900",
    },
    {
      title: "Questions",
      description: "Manage interview questions and question bank",
      href: "/questions",
      icon: HelpCircle,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900",
    },
    {
      title: "Documents",
      description: "Store and manage HR documents and templates",
      href: "/documents",
      icon: FolderOpen,
      color: "text-teal-600",
      bgColor: "bg-teal-100 dark:bg-teal-900",
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to DAC HR Platform
        </h1>
        <p className="text-lg text-muted-foreground">
          Streamline your hiring process and manage your workforce efficiently
        </p>
      </div>

      {/* Features Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Platform Features
          </h2>
          <p className="text-muted-foreground">
            Access all available tools and features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.href}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <Link href={{ pathname: feature.href }}>
                  <CardHeader>
                    <div className={`${feature.bgColor} p-3 rounded-lg w-fit`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="ghost"
                      className="w-full group-hover:bg-accent"
                      asChild
                    >
                      <span className="flex items-center justify-center gap-2">
                        Open
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={{ pathname: "/candidates/new" }}>
                Add New Candidate
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/employees/new" }}>
                Add New Employee
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/positions/new" }}>Create Position</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/rounds/new" }}>Create Round</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/questions/new" }}>Add Question</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/documents/new" }}>Upload Document</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}
