import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsBreadcrumb } from "@/components/docs/docs-breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Bug,
  RefreshCcw,
  TestTube2,
  LayoutPanelTop,
  GitBranch,
  Database,
  FileCode2,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_main/docs/whats-new")({
  head: () => ({
    meta: [{ title: "What's New - Documentation - DAC HR" }],
  }),
  component: WhatsNewDocsPage,
});

function WhatsNewDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <RefreshCcw className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">What&apos;s New</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          This page summarizes recent platform improvements for end users and
          administrators. It includes both behavior changes and technical
          implementation updates.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge>Security</Badge>
          <Badge variant="secondary">Reliability</Badge>
          <Badge variant="secondary">Data Integrity</Badge>
          <Badge variant="secondary">Accessibility</Badge>
          <Badge variant="secondary">Architecture</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Security & Access Control Updates
          </CardTitle>
          <CardDescription>
            Stronger permissions and safer handling of sensitive information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>
              Document preview access now requires authentication and stricter
              URL validation.
            </li>
            <li>
              Position deletion and audit-report generation are now admin-only
              actions.
            </li>
            <li>
              Sensitive logs were reduced and email data is now redacted in key
              auth/candidate routes.
            </li>
          </ul>
          <p>
            <strong>User impact:</strong> Unauthorized users can no longer
            access protected resources or run privileged admin actions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-600" />
            Bug Fixes & Correctness Improvements
          </CardTitle>
          <CardDescription>
            Fixed known edge cases and incorrect success paths.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>
              Document category updates now return a proper not-found response
              instead of failing later in the flow.
            </li>
            <li>
              Interview AI analysis deletion is now correctly scoped to the
              interview and returns precise failure reasons.
            </li>
            <li>
              Candidate document indexing/polling now has bounded timeout
              handling to prevent indefinite waits.
            </li>
          </ul>
          <p>
            <strong>User impact:</strong> More predictable error behavior and
            fewer silent failures.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Data Integrity & Race-Condition Hardening
          </CardTitle>
          <CardDescription>
            Improved consistency for concurrent actions and multi-step writes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>
              Candidate creation flows were made transactional to prevent
              partial records.
            </li>
            <li>
              Onboarding and interview feedback flows were updated to use upsert
              patterns for better concurrency behavior.
            </li>
            <li>
              New database uniqueness constraints were added for:
              candidate-position links, interview rounds per application stage,
              and interview feedback per question.
            </li>
          </ul>
          <p>
            <strong>User impact:</strong> Lower risk of duplicate records,
            inconsistent states, and race-related data errors.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutPanelTop className="h-5 w-5 text-violet-600" />
            UI/UX & Accessibility Improvements
          </CardTitle>
          <CardDescription>
            Better keyboard/screen-reader support and localization behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>
              Added accessible labels to icon-only controls and filtering
              inputs.
            </li>
            <li>
              Added skip-link and explicit main landmark support in docs/main
              layout.
            </li>
            <li>
              Replaced hardcoded US date formatting in key views with
              locale-aware formatting.
            </li>
          </ul>
          <p>
            <strong>User impact:</strong> Better accessibility compliance,
            improved navigation, and clearer regional date display.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5 text-amber-600" />
            Testing & Quality Pipeline Updates
          </CardTitle>
          <CardDescription>
            Added baseline test execution and deterministic utility tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>
              Workspace-level test scripts are now wired across apps/packages.
            </li>
            <li>Turbo now runs a dedicated test task in CI/local workflows.</li>
            <li>
              Added deterministic utility tests as baseline coverage for core
              formatting behavior.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-sky-600" />
            Implementation Architecture Changes
          </CardTitle>
          <CardDescription>
            Internal refactor to make the platform easier to evolve and support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            The platform now uses clearer service/repository boundaries in core
            candidate, document, interview, and audit flows.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              Added shared application services for candidate lifecycle and
              candidate document search-store orchestration.
            </li>
            <li>
              Added domain repository modules in the database package and
              migrated key consumers to these modules.
            </li>
            <li>
              Reduced duplicated logic between server actions and API routes by
              centralizing high-traffic operations.
            </li>
          </ul>
          <p>
            <strong>Admin/maintainer impact:</strong> Faster debugging, fewer
            divergence bugs, and cleaner extension points for future features.
          </p>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2">
          <p>
            The latest release focused on platform trustworthiness:
            strengthening access control, improving reliability under
            concurrency, and making the user experience more accessible and
            consistent.
          </p>
          <p>
            For feature-specific usage, continue with the individual docs pages
            (Candidates, Applications, Interviews, Documents, and AI Features).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-slate-600" />
            Change Scope
          </CardTitle>
          <CardDescription>
            Includes behavior changes and implementation upgrades delivered in
            the recent multi-wave improvement cycle.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
