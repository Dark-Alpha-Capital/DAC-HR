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
  Folders,
  Plus,
  ArrowRight,
  CheckCircle2,
  Tag,
  Search,
  Users,
  FileText,
  FolderOpen,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documents - Documentation - DAC HR",
  description: "Learn how to manage HR documents in DAC HR",
};

export default function DocumentsDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
            <Folders className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Documents</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Manage HR documents, templates, and files. Organize them by category
          for easy access and reference.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Document Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The documents section allows you to store and organize HR-related files:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Job descriptions</strong> - Role definitions and requirements</li>
            <li><strong>Onboarding materials</strong> - New hire documentation</li>
            <li><strong>Policies</strong> - Company policies and procedures</li>
            <li><strong>HR forms</strong> - Standard forms and templates</li>
            <li><strong>Other documents</strong> - Any other relevant files</li>
          </ul>
        </CardContent>
      </Card>

      {/* Document Types */}
      <Card>
        <CardHeader>
          <CardTitle>Document Categories</CardTitle>
          <CardDescription>
            Built-in categories for organizing documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge>job-description</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Job descriptions, role requirements, and position details
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge>onboarding</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                New hire orientation materials and welcome documents
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge>policy</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Company policies, handbooks, and procedures
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge>hr-form</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Standard HR forms, templates, and applications
              </p>
            </div>
            <div className="p-4 rounded-lg border col-span-full">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">other</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Any other documents that don't fit the above categories
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Custom Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            In addition to built-in categories, you can create custom categories:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to the <strong>Documents</strong> page</li>
            <li>Click the <strong>"Categories"</strong> tab</li>
            <li>Click <strong>"Add Category"</strong></li>
            <li>Enter a name and optional description</li>
            <li>Save the new category</li>
          </ol>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Custom categories help you organize documents
              in ways that match your organization's structure and needs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Uploading Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Uploading Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>Navigate to <strong>Documents</strong> from the sidebar</li>
            <li>Click the <strong>"New Document"</strong> button</li>
            <li>Fill in the document details:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Name - A descriptive title</li>
                <li>Description - What the document contains</li>
                <li>Category - Select the appropriate category</li>
                <li>Tags - Optional keywords for search</li>
                <li>File - Upload the actual document</li>
              </ul>
            </li>
            <li>Click <strong>"Create Document"</strong> to save</li>
          </ol>
        </CardContent>
      </Card>

      {/* Searching and Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Searching and Filtering
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Find documents quickly using multiple filters:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="font-semibold mb-1">Name Search</div>
              <p className="text-sm text-muted-foreground">
                Search by document title
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="font-semibold mb-1">Category Filter</div>
              <p className="text-sm text-muted-foreground">
                Filter by document category
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="font-semibold mb-1">Tags Filter</div>
              <p className="text-sm text-muted-foreground">
                Search by document tags
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Using Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Tags provide an additional way to organize and find documents:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Add multiple tags to each document</li>
            <li>Tags are searchable from the documents list</li>
            <li>Use consistent tag naming for better organization</li>
            <li>Common tags: department names, document types, years</li>
          </ul>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Example Tags:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">2024</Badge>
              <Badge variant="secondary">deal-team</Badge>
              <Badge variant="secondary">interview</Badge>
              <Badge variant="secondary">legal</Badge>
              <Badge variant="secondary">template</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate vs HR Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Document Types in the System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2 flex items-center gap-2">
                <Folders className="h-4 w-4 text-teal-600" />
                HR Documents
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Company-wide documents stored in the Documents section:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Job descriptions</li>
                <li>Policies and handbooks</li>
                <li>Forms and templates</li>
                <li>Onboarding materials</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                Candidate Documents
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Documents specific to individual candidates:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>Resumes/CVs</li>
                <li>Cover letters</li>
                <li>Portfolios</li>
                <li>Signed contracts</li>
              </ul>
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Candidate documents are uploaded through
              the candidate's profile page, not the Documents section.
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
              <span>Use descriptive names that clearly indicate the document content</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>Assign appropriate categories for easier filtering</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>Add relevant tags to improve searchability</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>Keep documents up to date by removing outdated versions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>Use consistent naming conventions across similar documents</span>
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
              href={{ pathname: "/docs/candidates" }}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>Candidates</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
            <Link
              href={{ pathname: "/docs/positions" }}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <FileText className="h-4 w-4 text-primary" />
              <span>Positions</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
