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
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Calendar,
  AlertCircle,
  Zap,
  Brain,
  Target,
} from "lucide-react";



export function AiFeaturesDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Sparkles className="h-6 w-6 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">AI Features</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Leverage AI to screen candidates and analyze interviews. Get
          intelligent insights to make better hiring decisions.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Recruitment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The DAC HR platform includes AI features powered by Google Gemini:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-violet-600" />
                <span className="font-semibold">Candidate Screening</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Analyze candidate documents to assess fit for positions
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-violet-600" />
                <span className="font-semibold">Interview Analysis</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Get AI insights on interview feedback and performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate AI Screening */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Candidate AI Screening
          </CardTitle>
          <CardDescription>
            Automatically analyze candidate resumes and documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            AI screening analyzes a candidate's documents (primarily their
            resume) against a position's requirements to provide:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Verdict</strong> - Overall recommendation (Strong Yes,
              Yes, Maybe, No)
            </li>
            <li>
              <strong>Score</strong> - Numerical rating (0-10)
            </li>
            <li>
              <strong>Explanation</strong> - Brief summary of the assessment
            </li>
            <li>
              <strong>Full Analysis</strong> - Detailed breakdown of
              qualifications
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* How to Run AI Screening */}
      <Card>
        <CardHeader>
          <CardTitle>Running AI Screening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Go to the <strong>Candidate's</strong> profile page
            </li>
            <li>
              Make sure the candidate has a <strong>resume uploaded</strong>
            </li>
            <li>
              Navigate to the <strong>"Do AI Analysis"</strong> tab
            </li>
            <li>
              Select the <strong>position</strong> to screen against (if
              applicable)
            </li>
            <li>
              Click <strong>"Run AI Analysis"</strong>
            </li>
            <li>Wait for the analysis to complete (usually a few seconds)</li>
            <li>
              View results in the <strong>"AI Screenings"</strong> tab
            </li>
          </ol>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Requirement:</strong> Candidates must have at least one
              document uploaded (preferably a resume) for AI screening to work
              effectively.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Understanding Screening Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Understanding Screening Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
                <Badge className="bg-green-600 mb-2">Strong Yes</Badge>
                <p className="text-sm text-muted-foreground">
                  Excellent fit. Candidate highly matches position requirements.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
                <Badge className="bg-blue-600 mb-2">Yes</Badge>
                <p className="text-sm text-muted-foreground">
                  Good fit. Candidate meets most position requirements.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
                <Badge className="bg-yellow-600 mb-2">Maybe</Badge>
                <p className="text-sm text-muted-foreground">
                  Potential fit. Some requirements met, worth further review.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
                <Badge className="bg-red-600 mb-2">No</Badge>
                <p className="text-sm text-muted-foreground">
                  Poor fit. Candidate doesn't match key requirements.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview AI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Interview AI Analysis
          </CardTitle>
          <CardDescription>
            Get AI insights on interview performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Run AI analysis on any interview using a screener rubric. The system
            analyzes full candidate responses — whether from manual recruiter
            notes or AI session transcripts — and produces:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Summary of interview performance</li>
            <li>Strengths and areas of concern</li>
            <li>Recommendations for next steps</li>
            <li>Comparison to position requirements and screener criteria</li>
          </ul>
        </CardContent>
      </Card>

      {/* Running Interview Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Running Interview Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Create a <strong>Screener</strong> under Configuration → Screeners
              with your evaluation criteria in Markdown
            </li>
            <li>
              Go to the specific <strong>Interview</strong> page
            </li>
            <li>
              Navigate to the <strong>"AI Analysis"</strong> tab
            </li>
            <li>
              Select the <strong>screener</strong> you want to evaluate against
            </li>
            <li>
              Optionally add <strong>custom instructions</strong> for this run
            </li>
            <li>
              Click <strong>"Run AI Analysis"</strong>
            </li>
            <li>
              View results in the <strong>Screenings</strong> tab
            </li>
          </ol>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> For manual interviews, record question
              feedback first. For AI sessions, complete the interview so
              responses are available. Detailed screeners produce better
              analysis.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <span>
                AI analysis is a tool to assist decision-making, not replace
                human judgment
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <span>
                Results quality depends on the quality of input documents and
                feedback
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <span>
                Always verify AI recommendations with your own assessment
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <span>
                AI may not capture all nuances of a candidate's qualifications
              </span>
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
                Upload complete, well-formatted resumes for best screening
                results
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Run AI screening early in the process to prioritize candidates
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Provide detailed interview feedback before running analysis
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use custom prompts to ask specific questions about candidates
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Review AI results alongside other candidate information
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Save multiple AI screenings to track how candidates improve
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
