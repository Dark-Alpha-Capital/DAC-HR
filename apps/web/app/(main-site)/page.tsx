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
  ArrowDown,
  CheckCircle2,
  Circle,
  ArrowRightCircle,
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

  const workflowSteps = [
    {
      step: 1,
      title: "Create a Position",
      description:
        "Start by creating a job position that you want to fill. Define the role, requirements, and details for the opening.",
      icon: Briefcase,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900",
      href: "/positions",
    },
    {
      step: 2,
      title: "Create Candidates",
      description:
        "Add candidate profiles to the system. Each candidate can be assigned to one or more positions they're applying for.",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900",
      href: "/candidates",
    },
    {
      step: 3,
      title: "Create Applications",
      description:
        "Link candidates to positions by creating applications. Each application connects a candidate to a specific position, tracking their journey through the hiring process.",
      icon: ClipboardList,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900",
      href: "/applications",
    },
    {
      step: 4,
      title: "Set Up Interview Rounds",
      description:
        "Create interview rounds for each application. These rounds represent different stages of the interview process (e.g., Phone Screen, Technical Interview, Final Round).",
      icon: Calendar,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900",
      href: "/rounds",
    },
    {
      step: 5,
      title: "Add Questions",
      description:
        "For each interview round, add questions that candidates need to answer. Manage your question bank and reuse questions across different rounds and positions.",
      icon: HelpCircle,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900",
      href: "/questions",
    },
  ];

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
    <div className="container mx-auto py-8 space-y-12">
      {/* Hero Section */}
      <div className="space-y-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Welcome to DAC HR Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A comprehensive recruitment management system designed to streamline
          your entire hiring process from position creation to candidate
          evaluation.
        </p>
      </div>

      {/* System Overview */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">How the System Works</CardTitle>
          <CardDescription className="text-base">
            Understanding the complete recruitment workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            The DAC HR Platform follows a structured workflow to manage
            recruitment efficiently. The process begins with creating positions
            for open roles, followed by adding candidates who can be assigned to
            those positions. Each candidate-position pairing creates an
            application, which tracks the candidate's progress through multiple
            interview rounds. Each round can be customized with specific
            questions to evaluate candidates systematically.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="font-semibold mb-2">Key Flow:</p>
            <p className="text-sm text-muted-foreground">
              Position → Candidate → Application → Interview Rounds → Questions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Complete Workflow Guide
          </h2>
          <p className="text-muted-foreground">
            Follow these steps to manage your recruitment process
          </p>
        </div>

        <div className="space-y-4">
          {workflowSteps.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === workflowSteps.length - 1;
            return (
              <div key={item.step} className="relative">
                <Card className="hover:shadow-lg transition-shadow">
                  <Link href={{ pathname: item.href }}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          <div
                            className={`${item.bgColor} p-3 rounded-lg w-fit`}
                          >
                            <Icon className={`h-6 w-6 ${item.color}`} />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                              {item.step}
                            </span>
                            <CardTitle className="text-xl">
                              {item.title}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-base leading-relaxed">
                            {item.description}
                          </CardDescription>
                          <Button
                            variant="ghost"
                            className="mt-2"
                            size="sm"
                            asChild
                          >
                            <span className="flex items-center gap-2">
                              Go to {item.title}
                              <ArrowRightCircle className="h-4 w-4" />
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Link>
                </Card>
                {!isLast && (
                  <div className="flex justify-center my-2">
                    <ArrowDown className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Detailed Process Explanation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-orange-600" />
                1. Position Management
              </h3>
              <p className="text-muted-foreground pl-7">
                To manage recruitment effectively, you first need to create
                positions. These represent job openings within your
                organization. Each position contains details such as job title,
                description, requirements, and department. Positions serve as
                the foundation for the entire recruitment process.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                2. Candidate Management
              </h3>
              <p className="text-muted-foreground pl-7">
                Once positions are created, you can add candidates to the
                system. Candidates represent individuals who are interested in
                applying for your open positions. Each candidate profile
                contains their personal information, contact details, and
                relevant documents. Candidates can be assigned to one or more
                positions they wish to apply for.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
                3. Application Tracking
              </h3>
              <p className="text-muted-foreground pl-7">
                When a candidate is assigned to a position, an application is
                automatically created. The application is the crucial link that
                connects a candidate to a specific position. It tracks the
                candidate's status, progress, and journey through the hiring
                process. Each application can have its own status (e.g.,
                Applied, In Review, Interviewing, Offer Extended, Hired,
                Rejected).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-pink-600" />
                4. Interview Rounds
              </h3>
              <p className="text-muted-foreground pl-7">
                For each application, you can create multiple interview rounds
                to evaluate candidates at different stages. These rounds could
                include phone screenings, technical interviews, panel
                interviews, final rounds, etc. Each round represents a distinct
                phase in the evaluation process and allows you to structure the
                interview process systematically.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-cyan-600" />
                5. Question Management
              </h3>
              <p className="text-muted-foreground pl-7">
                Within each interview round, you can assign questions that the
                candidate needs to answer. This allows for standardized
                evaluation across all candidates. You can maintain a question
                bank and reuse questions across different rounds and positions,
                ensuring consistency in the interview process. Questions can be
                tailored to assess technical skills, behavioral competencies, or
                role-specific knowledge.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access to Features */}
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
          <CardDescription>
            Get started quickly with these common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={{ pathname: "/positions/new" }}>
                <Briefcase className="mr-2 h-4 w-4" />
                Create Position
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/candidates/new" }}>
                <Users className="mr-2 h-4 w-4" />
                Add New Candidate
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/rounds/new" }}>
                <Calendar className="mr-2 h-4 w-4" />
                Create Round
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/questions/new" }}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Add Question
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/employees/new" }}>
                <UserCheck className="mr-2 h-4 w-4" />
                Add New Employee
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={{ pathname: "/documents/new" }}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Upload Document
              </Link>
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
