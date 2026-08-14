import { Link } from "@tanstack/react-router";
import { DocsBreadcrumb } from "#/features/docs/components/docs-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  Briefcase,
  Users,
  FileText,
  CircleDot,
  HelpCircle,
  Calendar,
  Folders,
  Building2,
  Sparkles,
  ArrowRight,
  Route as RouteIcon,
  CheckCircle2,
  ArrowDown,
  RefreshCcw,
} from "lucide-react";

const quickLinks = [
  {
    title: "Positions",
    description: "Create and manage job openings",
    href: "/docs/positions",
    icon: Briefcase,
  },
  {
    title: "Candidates",
    description: "Manage candidate profiles and documents",
    href: "/docs/candidates",
    icon: Users,
  },
  {
    title: "Applications",
    description: "Track candidate applications",
    href: "/docs/applications",
    icon: FileText,
  },
  {
    title: "Interviews",
    description: "Record and evaluate interviews",
    href: "/docs/interviews",
    icon: Calendar,
  },
  {
    title: "AI Features",
    description: "Use AI for screening and analysis",
    href: "/docs/ai-features",
    icon: Sparkles,
  },
  {
    title: "What's New",
    description: "Latest platform updates and behavior changes",
    href: "/docs/whats-new",
    icon: RefreshCcw,
  },
  {
    title: "Workflows",
    description: "End-to-end recruitment guides",
    href: "/docs/workflows",
    icon: RouteIcon,
  },
];

const workflowSteps = [
  {
    step: 1,
    title: "Create Position",
    description: "Define the job role you're hiring for",
  },
  {
    step: 2,
    title: "Add Candidates",
    description: "Input candidate information and documents",
  },
  {
    step: 3,
    title: "Create Applications",
    description: "Link candidates to positions",
  },
  {
    step: 4,
    title: "Setup Rounds",
    description: "Define interview stages for the position",
  },
  {
    step: 5,
    title: "Conduct Interviews",
    description: "Record feedback and ratings",
  },
  {
    step: 6,
    title: "Make Decision",
    description: "Hire or reject based on evaluations",
  },
];



export function DocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Getting Started</h1>
        <p className="text-xl text-muted-foreground">
          Welcome to the DAC HR Platform documentation. Learn how to manage your
          entire recruitment process from creating positions to hiring
          candidates.
        </p>
      </div>

      {/* Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Overview</CardTitle>
          <CardDescription>
            Understanding the DAC HR recruitment system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The DAC HR Platform is a comprehensive recruitment management system
            designed to streamline your hiring process. It provides tools for
            managing job positions, tracking candidates, conducting structured
            interviews, and leveraging AI for candidate screening.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-primary">Positions</div>
              <div className="text-sm text-muted-foreground">
                Define job openings
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-primary">Candidates</div>
              <div className="text-sm text-muted-foreground">
                Manage applicants
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold text-primary">Interviews</div>
              <div className="text-sm text-muted-foreground">
                Evaluate talent
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recruitment Workflow */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">The Recruitment Workflow</h2>
        <p className="text-muted-foreground">
          Follow these steps for a successful recruitment process:
        </p>
        <div className="space-y-2">
          {workflowSteps.map((item, index) => (
            <div key={item.step} className="relative">
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-muted-foreground/30" />
              </div>
              {index < workflowSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Explore the Documentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                to={link.href}
              >
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {link.title}
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardTitle>
                        <CardDescription>{link.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Key Concepts */}
      <Card>
        <CardHeader>
          <CardTitle>Key Concepts</CardTitle>
          <CardDescription>
            Important terms and relationships in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Position
              </dt>
              <dd className="text-muted-foreground ml-6">
                A job opening that you want to fill. Positions have a name,
                department, hire level, and status.
              </dd>
            </div>
            <div>
              <dt className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Candidate
              </dt>
              <dd className="text-muted-foreground ml-6">
                A person applying for one or more positions. Candidates have
                contact information and can have documents attached (resumes,
                portfolios, etc.).
              </dd>
            </div>
            <div>
              <dt className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Application
              </dt>
              <dd className="text-muted-foreground ml-6">
                The link between a candidate and a position. An application
                tracks the candidate's progress through the hiring process for
                that specific role.
              </dd>
            </div>
            <div>
              <dt className="font-semibold flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" />
                Round Template
              </dt>
              <dd className="text-muted-foreground ml-6">
                A template for an interview stage (e.g., "Phone Screen",
                "Technical Interview"). Rounds are linked to positions and
                contain questions from the question bank.
              </dd>
            </div>
            <div>
              <dt className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Interview
              </dt>
              <dd className="text-muted-foreground ml-6">
                An instance of a candidate going through a round. Interviews
                contain feedback, ratings, and the decision to move forward or
                reject.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* User Roles */}
      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>
            Different access levels in the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">Recruiter</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- View and manage candidates</li>
                <li>- Create and track applications</li>
                <li>- Record interview feedback</li>
                <li>- Use AI screening tools</li>
                <li>- Manage documents</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">Admin</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- All recruiter capabilities</li>
                <li>- Create and manage positions</li>
                <li>- Configure interview rounds</li>
                <li>- Manage employees</li>
                <li>- View audit logs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Ready to start? Here are the recommended next steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <Link
                to="/docs/positions"
                className="text-primary hover:underline"
              >
                Learn how to create positions
              </Link>
            </li>
            <li>
              <Link
                to="/docs/candidates"
                className="text-primary hover:underline"
              >
                Understand candidate management
              </Link>
            </li>
            <li>
              <Link
                to={"/docs/workflows/hiring" as "/docs"}
                className="text-primary hover:underline"
              >
                Follow the complete hiring workflow guide
              </Link>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
