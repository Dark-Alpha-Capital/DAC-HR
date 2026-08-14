import { Link } from "@tanstack/react-router";
import { DocsBreadcrumb } from "#/features/docs/components/docs-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import {
  FileText,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  Eye,
  MessageSquare,
  Calendar,
  Users,
  Briefcase,
} from "lucide-react";



export function ApplicationsDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Applications</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Applications link candidates to positions and track their progress
          through the hiring process.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What is an Application?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            An application represents a candidate's journey through the hiring
            process for a specific position. Key aspects:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              Links one <strong>candidate</strong> to one{" "}
              <strong>position</strong>
            </li>
            <li>
              Tracks the candidate's <strong>status</strong> through the hiring
              funnel
            </li>
            <li>
              Contains all <strong>interviews</strong> conducted for this
              application
            </li>
            <li>
              Can have a <strong>personality type</strong> assigned (MBTI)
            </li>
            <li>
              A candidate can have multiple applications for different positions
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Application Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Application Statuses</CardTitle>
          <CardDescription>
            Track where each candidate is in the hiring process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="font-semibold">Pending</div>
                <p className="text-sm text-muted-foreground">
                  Application received, not yet reviewed
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Eye className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-semibold">Reviewed</div>
                <p className="text-sm text-muted-foreground">
                  Application has been reviewed by recruiter
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-semibold">Shortlisted</div>
                <p className="text-sm text-muted-foreground">
                  Candidate selected for further consideration
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <MessageSquare className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <div className="font-semibold">Interviewing</div>
                <p className="text-sm text-muted-foreground">
                  Candidate is in active interview process
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <UserCheck className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <div className="font-semibold">Hired</div>
                <p className="text-sm text-muted-foreground">
                  Candidate has been hired for the position
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <div className="font-semibold">Rejected</div>
                <p className="text-sm text-muted-foreground">
                  Application has been declined
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border col-span-full md:col-span-1">
              <XCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="font-semibold">Withdrawn</div>
                <p className="text-sm text-muted-foreground">
                  Candidate withdrew their application
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creating Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Creating an Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Applications can be created in two ways:
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">
                Method 1: From Candidate Page
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to the candidate's profile</li>
                <li>Navigate to the Applications tab</li>
                <li>Click "Add Application"</li>
                <li>Select the position to apply for</li>
              </ol>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">
                Method 2: From Applications Page
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Navigate to Applications from the sidebar</li>
                <li>Click "New Application"</li>
                <li>Select the candidate</li>
                <li>Select the position</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Detail View */}
      <Card>
        <CardHeader>
          <CardTitle>Application Detail View</CardTitle>
          <CardDescription>
            What you see when viewing an application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Progress Timeline</div>
              <p className="text-sm text-muted-foreground">
                Visual timeline showing the candidate's journey through
                interview rounds.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Status & Personality</div>
              <p className="text-sm text-muted-foreground">
                Current application status and MBTI personality type (if
                assigned).
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Interview List</div>
              <p className="text-sm text-muted-foreground">
                All interviews conducted for this application, with status,
                rating, and feedback.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Record Interview Button</div>
              <p className="text-sm text-muted-foreground">
                Quick action to record a new interview for any round.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personality Types */}
      <Card>
        <CardHeader>
          <CardTitle>Personality Types (MBTI)</CardTitle>
          <CardDescription>
            Optionally track candidate personality types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You can assign MBTI personality types to applications for additional
            insight:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">ENFJ</Badge>
            <Badge variant="secondary">ENFP</Badge>
            <Badge variant="secondary">ENTJ</Badge>
            <Badge variant="secondary">ENTP</Badge>
            <Badge variant="secondary">ESFJ</Badge>
            <Badge variant="secondary">ESFP</Badge>
            <Badge variant="secondary">ESTJ</Badge>
            <Badge variant="secondary">ESTP</Badge>
            <Badge variant="secondary">INFJ</Badge>
            <Badge variant="secondary">INTJ</Badge>
            <Badge variant="secondary">INTP</Badge>
            <Badge variant="secondary">ISFJ</Badge>
            <Badge variant="secondary">ISFP</Badge>
            <Badge variant="secondary">ISTJ</Badge>
            <Badge variant="secondary">ISTP</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Updating Status */}
      <Card>
        <CardHeader>
          <CardTitle>Updating Application Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You can update an application's status from multiple places:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Application page</strong> - Click the status badge to
              change it
            </li>
            <li>
              <strong>Candidate page</strong> - Update status directly from the
              Applications tab
            </li>
            <li>
              <strong>Applications list</strong> - Quick status update from the
              list view
            </li>
          </ul>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Keep statuses up to date to maintain an
              accurate pipeline view and for effective reporting.
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
                Update application status immediately after each hiring decision
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use "Interviewing" status when actively scheduling or conducting
                interviews
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>Record all interviews to maintain a complete history</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Mark applications as "Withdrawn" rather than deleting if
                candidate drops out
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
              to="/docs/candidates"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>Candidates</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
            <Link
              to="/docs/interviews"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Calendar className="h-4 w-4 text-primary" />
              <span>Interviews</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
            <Link
              to="/docs/positions"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Briefcase className="h-4 w-4 text-primary" />
              <span>Positions</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
