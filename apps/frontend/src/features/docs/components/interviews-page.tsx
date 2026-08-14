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
  Calendar,
  Plus,
  ArrowRight,
  CheckCircle2,
  Star,
  MessageSquare,
  XCircle,
  Clock,
  FileText,
  Sparkles,
  Users,
  CircleDot,
} from "lucide-react";



export function InterviewsDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Calendar className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Interviews</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Interviews are instances of candidates going through interview rounds.
          Record feedback, ratings, and decisions for each interview.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What is an Interview?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            An interview record captures a specific interview session. It
            includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Round Template</strong> - Which interview stage (Phone
              Screen, Technical, etc.)
            </li>
            <li>
              <strong>Interviewer</strong> - Who conducted the interview
            </li>
            <li>
              <strong>Status</strong> - The outcome (Pending, Move Forward,
              Rejected)
            </li>
            <li>
              <strong>Rating</strong> - Overall score (1-5)
            </li>
            <li>
              <strong>Question Feedback</strong> - Notes and ratings for each
              question
            </li>
            <li>
              <strong>Overall Feedback</strong> - Summary comments about the
              candidate
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Interview Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Statuses</CardTitle>
          <CardDescription>Track the outcome of each interview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <div className="font-semibold">Pending</div>
                <p className="text-sm text-muted-foreground">
                  Interview scheduled or in progress, no decision yet
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-semibold">Scheduled</div>
                <p className="text-sm text-muted-foreground">
                  Interview has been scheduled for a specific time
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-semibold">Move Forward</div>
                <p className="text-sm text-muted-foreground">
                  Candidate passed this round and should proceed
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <div className="font-semibold">Rejected</div>
                <p className="text-sm text-muted-foreground">
                  Candidate did not pass this interview round
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recording an Interview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Recording an Interview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Go to the <strong>Application</strong> page for the candidate
            </li>
            <li>
              Click <strong>&quot;Record Interview&quot;</strong>
            </li>
            <li>
              Choose <strong>Generate AI Link</strong> for a position-level link
              (all rounds) or <strong>Record Manual</strong> for a single round
            </li>
            <li>
              For AI links, set <strong>Form</strong> or <strong>Voice</strong>{" "}
              mode per round
            </li>
            <li>
              For manual interviews, select round, interviewer, and optional date
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Interview Detail View */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Detail View</CardTitle>
          <CardDescription>
            What you see when viewing an interview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Questions Tab
              </div>
              <p className="text-sm text-muted-foreground">
                View all questions from the round template. Add notes and
                ratings for each question.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Summary Tab
              </div>
              <p className="text-sm text-muted-foreground">
                Set the overall status, rating, and write summary feedback. Make
                the proceed/reject decision.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Analysis Tab
              </div>
              <p className="text-sm text-muted-foreground">
                Run AI analysis on the interview feedback to get insights and
                recommendations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Rating System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Both individual questions and overall interviews use a 1-5 rating
            scale:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Badge variant="secondary">1</Badge>
              <span className="text-sm">Poor - Does not meet requirements</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Badge variant="secondary">2</Badge>
              <span className="text-sm">Below Average - Significant gaps</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Badge variant="secondary">3</Badge>
              <span className="text-sm">
                Average - Meets basic requirements
              </span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Badge variant="secondary">4</Badge>
              <span className="text-sm">Good - Exceeds some expectations</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Badge variant="secondary">5</Badge>
              <span className="text-sm">Excellent - Exceptional candidate</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Providing Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Providing Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <div className="font-semibold mb-2">Question-Level Feedback</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Navigate to the Questions tab</li>
                <li>Click on each question to expand it</li>
                <li>Add notes about the candidate's response</li>
                <li>Rate the response (1-5)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Overall Feedback</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Navigate to the Summary tab</li>
                <li>Select the interview status (Move Forward / Rejected)</li>
                <li>Set an overall rating (1-5)</li>
                <li>Write summary feedback about the candidate</li>
                <li>Indicate whether to proceed to the next round</li>
              </ul>
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
                Record feedback immediately after the interview while details
                are fresh
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Be specific in your notes - include examples and quotes when
                possible
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Rate each question individually to identify strengths and
                weaknesses
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use the overall feedback to summarize key points for hiring
                managers
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Set the status promptly so the hiring process can continue
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use AI analysis for additional insights on candidate performance
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
              to="/docs/rounds"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <CircleDot className="h-4 w-4 text-primary" />
              <span>Interview Rounds</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
            <Link
              to="/docs/applications"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <FileText className="h-4 w-4 text-primary" />
              <span>Applications</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
            <Link
              to="/docs/ai-features"
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
