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
  Building2,
  Plus,
  ArrowRight,
  CheckCircle2,
  Users,
  Briefcase,
  Shield,
  Image,
  FileText,
} from "lucide-react";



export function EmployeesDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Building2 className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Employees</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Manage employee records for hired team members. Track departments,
          positions, and employee information.
        </p>
      </div>

      {/* Admin Notice */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-600" />
            Admin Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The Employees section is only visible to{" "}
            <strong>admin users</strong>. Regular recruiters do not have access
            to employee management.
          </p>
        </CardContent>
      </Card>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Each employee record contains:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Name</strong> - First and last name
            </li>
            <li>
              <strong>Department(s)</strong> - Which team(s) they belong to
            </li>
            <li>
              <strong>Position</strong> - Their job role (linked to Positions)
            </li>
            <li>
              <strong>Profile Image</strong> - Optional photo
            </li>
            <li>
              <strong>Bio</strong> - Optional description or notes
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Departments */}
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Available departments for employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Management</Badge>
            <Badge variant="secondary">Capital Markets</Badge>
            <Badge variant="secondary">Deal Team</Badge>
            <Badge variant="secondary">Legal</Badge>
            <Badge variant="secondary">Operations</Badge>
            <Badge variant="secondary">Origination</Badge>
            <Badge variant="secondary">PIPE</Badge>
            <Badge variant="secondary">Public Markets</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            An employee can belong to multiple departments if they work across
            teams.
          </p>
        </CardContent>
      </Card>

      {/* Creating Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adding an Employee
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Navigate to <strong>Employees</strong> from the sidebar (admin
              only)
            </li>
            <li>
              Click the <strong>"New Employee"</strong> button
            </li>
            <li>
              Fill in the employee details:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>First name and last name (required)</li>
                <li>Select department(s) (required)</li>
                <li>Optionally link to a position</li>
                <li>Upload a profile image</li>
                <li>Add a bio or notes</li>
              </ul>
            </li>
            <li>
              Click <strong>"Create Employee"</strong> to save
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* From Candidate to Employee */}
      <Card>
        <CardHeader>
          <CardTitle>From Candidate to Employee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            When a candidate is hired, they become an employee. The typical flow
            is:
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm shrink-0">
                1
              </div>
              <div>
                <div className="font-semibold">Update Application Status</div>
                <p className="text-sm text-muted-foreground">
                  Mark the candidate's application status as "Hired"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm shrink-0">
                2
              </div>
              <div>
                <div className="font-semibold">
                  Complete Onboarding Checklist
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the candidate's checklist tab to track onboarding tasks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold text-sm shrink-0">
                3
              </div>
              <div>
                <div className="font-semibold">Create Employee Record</div>
                <p className="text-sm text-muted-foreground">
                  Create a new employee record with their information
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Candidate and employee records are
              separate. Creating an employee doesn't automatically link to or
              modify the candidate record.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtering Employees */}
      <Card>
        <CardHeader>
          <CardTitle>Searching and Filtering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Find employees using the available filters:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Name search</strong> - Search by employee name
            </li>
            <li>
              <strong>Position filter</strong> - Filter by job position
            </li>
            <li>
              <strong>Department filter</strong> - Filter by department
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Employee Detail View */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Detail View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            When viewing an employee profile, you can see:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Profile Image</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Employee photo (if uploaded)
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Department</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Team(s) they belong to
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Position</span>
              </div>
              <p className="text-sm text-muted-foreground">Their job role</p>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Bio</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Description or notes
              </p>
            </div>
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
                Create employee records promptly after hiring decisions
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Keep department assignments up to date as employees move teams
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Link employees to positions to track headcount per role
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>Upload profile images for better team visualization</span>
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
