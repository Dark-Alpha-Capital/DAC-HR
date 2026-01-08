import { Metadata } from "next";
import { DocsBreadcrumb } from "@/components/docs/docs-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Settings,
  Users,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Pause,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Positions - Documentation - DAC HR",
  description: "Learn how to create and manage job positions in DAC HR",
};

export default function PositionsDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Briefcase className="h-6 w-6 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Positions</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Positions represent job openings in your organization. They are the
          foundation of your recruitment process.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What is a Position?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            A position is a job opening that you want to fill. Each position
            contains:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Name</strong> - The job title (e.g., "Software Engineer",
              "Marketing Manager")
            </li>
            <li>
              <strong>Description</strong> - Details about the role and
              responsibilities
            </li>
            <li>
              <strong>Department</strong> - The team or department (e.g., Deal
              Team, Operations, Legal)
            </li>
            <li>
              <strong>Hire Level</strong> - The seniority level (Intern,
              Analyst, Associate, VP, MD)
            </li>
            <li>
              <strong>Status</strong> - Whether the position is actively being
              recruited for
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Position Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Position Statuses</CardTitle>
          <CardDescription>
            Each position has a status that indicates its current state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-semibold">Active</div>
                <p className="text-sm text-muted-foreground">
                  Currently recruiting. Candidates can be assigned and
                  interviews scheduled.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Pause className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-semibold">Hold</div>
                <p className="text-sm text-muted-foreground">
                  Recruitment temporarily paused. Existing applications remain.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <div className="font-semibold">Passed</div>
                <p className="text-sm text-muted-foreground">
                  Position has been filled or closed. No longer accepting
                  applications.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-semibold">Upcoming</div>
                <p className="text-sm text-muted-foreground">
                  Position is planned but recruitment hasn't started yet.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            Available departments in the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Management</Badge>
            <Badge variant="outline">Capital Markets</Badge>
            <Badge variant="outline">Deal Team</Badge>
            <Badge variant="outline">Legal</Badge>
            <Badge variant="outline">Operations</Badge>
            <Badge variant="outline">Origination</Badge>
            <Badge variant="outline">PIPE</Badge>
            <Badge variant="outline">Public Markets</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Hire Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Hire Levels</CardTitle>
          <CardDescription>Seniority levels for positions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Intern</span>
              <span className="text-sm text-muted-foreground">
                Entry-level internship
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Analyst</span>
              <span className="text-sm text-muted-foreground">
                Junior full-time role
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Associate</span>
              <span className="text-sm text-muted-foreground">
                Mid-level position
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Vice President</span>
              <span className="text-sm text-muted-foreground">
                Senior position
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Managing Director</span>
              <span className="text-sm text-muted-foreground">
                Executive level
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Create */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Creating a Position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Navigate to <strong>Positions</strong> from the sidebar
            </li>
            <li>
              Click the <strong>"New Position"</strong> button
            </li>
            <li>
              Fill in the position details:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Enter a descriptive name for the role</li>
                <li>Add a description of the job responsibilities</li>
                <li>Select the department(s) this role belongs to</li>
                <li>Choose the appropriate hire level</li>
                <li>Set the initial status (usually "Active" or "Upcoming")</li>
              </ul>
            </li>
            <li>
              Click <strong>"Create Position"</strong> to save
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Interview Rounds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setting Up Interview Rounds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            After creating a position, you need to link interview round
            templates to it. This defines the interview stages candidates will
            go through.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              Go to <strong>Rounds</strong> from the sidebar
            </li>
            <li>
              Create round templates if you haven't already (e.g., "Phone
              Screen", "Technical Interview")
            </li>
            <li>Link the round templates to your position</li>
            <li>Add questions to each round template</li>
          </ol>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Round templates can be reused across
              multiple positions. Create templates for common interview types
              and link them as needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use clear, descriptive position names that candidates will
                recognize
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Include detailed job descriptions to help with AI screening
                accuracy
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Set up interview rounds before adding candidates to streamline
                the process
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Update position status promptly when recruitment state changes
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                A position can have multiple departments if it's a
                cross-functional role
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Related Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Related Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={{
                pathname: "/docs/candidates",
              }}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>Candidates</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
            <Link
              href={{
                pathname: "/docs/rounds",
              }}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4 text-primary" />
              <span>Interview Rounds</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
