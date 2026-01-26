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
  Users,
  Plus,
  FileText,
  Upload,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ClipboardList,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Candidates - Documentation - DAC HR",
  description: "Learn how to manage candidates in DAC HR",
};

export default function CandidatesDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Users className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Candidates</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Candidates are individuals applying for positions at your
          organization. Manage their profiles, documents, and track their
          application journey.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Each candidate profile contains:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Name</strong> - First and last name
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Email</strong> - Contact email (unique)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Phone</strong> - Contact number
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Location</strong> - Where they're based
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Source</strong> - How they found you
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Notes</strong> - Additional information
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Detail Tabs</CardTitle>
          <CardDescription>
            When viewing a candidate, you have access to multiple tabs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Overview</div>
              <p className="text-sm text-muted-foreground">
                Contact information, source details, and notes about the
                candidate.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Applications</div>
              <p className="text-sm text-muted-foreground">
                All positions the candidate has applied for, with status and
                interview progress.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Documents</div>
              <p className="text-sm text-muted-foreground">
                Resumes, cover letters, portfolios, and other uploaded files.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">AI Screenings</div>
              <p className="text-sm text-muted-foreground">
                Previous AI analysis results for this candidate.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Do AI Analysis</div>
              <p className="text-sm text-muted-foreground">
                Run a new AI screening analysis on the candidate's documents.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Checklist</div>
              <p className="text-sm text-muted-foreground">
                Onboarding checklist for candidates who have been hired.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creating Candidates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adding a New Candidate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Navigate to <strong>Candidates</strong> from the sidebar
            </li>
            <li>
              Click the <strong>"New Candidate"</strong> button
            </li>
            <li>
              Fill in the candidate information:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>First name and last name (required)</li>
                <li>Email address (required, must be unique)</li>
                <li>Phone number</li>
                <li>Location</li>
                <li>Source (e.g., LinkedIn, Indeed, Referral)</li>
                <li>Source URL (link to their profile)</li>
                <li>Notes</li>
              </ul>
            </li>
            <li>
              Click <strong>"Create Candidate"</strong> to save
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Bulk Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Candidates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You can upload multiple candidates at once using a CSV file:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              Click the <strong>"Bulk Upload"</strong> button on the Candidates
              page
            </li>
            <li>Download the CSV template</li>
            <li>Fill in candidate data in the template</li>
            <li>Upload the completed CSV file</li>
            <li>Review and confirm the import</li>
          </ol>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">CSV Template Columns:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">firstName</Badge>
              <Badge variant="secondary">lastName</Badge>
              <Badge variant="secondary">email</Badge>
              <Badge variant="secondary">phone</Badge>
              <Badge variant="secondary">location</Badge>
              <Badge variant="secondary">source</Badge>
              <Badge variant="secondary">sourceUrl</Badge>
              <Badge variant="secondary">note</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Candidate Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Upload and manage documents for each candidate:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border">
              <Badge className="mb-2">Resume</Badge>
              <p className="text-sm text-muted-foreground">
                The candidate's CV or resume
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <Badge className="mb-2">Cover Letter</Badge>
              <p className="text-sm text-muted-foreground">
                Application cover letter
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <Badge className="mb-2">Portfolio</Badge>
              <p className="text-sm text-muted-foreground">
                Work samples or portfolio
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <Badge className="mb-2">Other</Badge>
              <p className="text-sm text-muted-foreground">
                Any other relevant documents
              </p>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg mt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Documents are used by the AI screening
              feature to analyze candidates. Upload resumes for the most
              accurate AI analysis results.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtering */}
      <Card>
        <CardHeader>
          <CardTitle>Searching and Filtering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Find candidates quickly using the filter options:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Name search</strong> - Search by first or last name
            </li>
            <li>
              <strong>Email search</strong> - Search by email address
            </li>
            <li>
              <strong>Position filter</strong> - Show candidates who applied for
              specific positions
            </li>
          </ul>
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
                Always include a valid email address - it's the unique
                identifier
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Upload the candidate's resume for AI screening to work
                effectively
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Record the source to track which channels bring the best
                candidates
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use notes to record initial impressions or important details
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Create applications after adding a candidate to link them to
                positions
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
                pathname: "/docs/applications",
              }}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <ClipboardList className="h-4 w-4 text-primary" />
              <span>Applications</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
            <Link
              href={{
                pathname: "/docs/ai-features",
              }}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI Features</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
