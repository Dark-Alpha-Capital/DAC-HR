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
  HelpCircle,
  Plus,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Calendar,
  RefreshCw,
} from "lucide-react";



export function QuestionsDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
            <HelpCircle className="h-6 w-6 text-cyan-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Questions</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          The question bank is a central repository of interview questions that
          can be reused across different interview rounds and positions.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What is the Question Bank?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The question bank allows you to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Create</strong> standardized interview questions
            </li>
            <li>
              <strong>Reuse</strong> questions across multiple round templates
            </li>
            <li>
              <strong>Maintain consistency</strong> in candidate evaluation
            </li>
            <li>
              <strong>Build</strong> a library of proven questions over time
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* How Questions Work */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            How Questions Flow Through the System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <HelpCircle className="h-6 w-6 text-cyan-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Question Bank</div>
                <p className="text-sm text-muted-foreground">
                  Central repository of all questions
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <CircleDot className="h-6 w-6 text-pink-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Round Templates</div>
                <p className="text-sm text-muted-foreground">
                  Questions are linked to interview rounds
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Interviews</div>
                <p className="text-sm text-muted-foreground">
                  Questions appear during interview recording
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Types */}
      <Card>
        <CardHeader>
          <CardTitle>Types of Questions</CardTitle>
          <CardDescription>
            Common categories for interview questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">Technical Questions</div>
              <p className="text-sm text-muted-foreground mb-2">
                Assess technical knowledge and problem-solving
              </p>
              <p className="text-xs text-muted-foreground italic">
                "Explain the difference between SQL and NoSQL databases."
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">Behavioral Questions</div>
              <p className="text-sm text-muted-foreground mb-2">
                Understand past behavior and soft skills
              </p>
              <p className="text-xs text-muted-foreground italic">
                "Tell me about a time you handled a difficult team situation."
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">Situational Questions</div>
              <p className="text-sm text-muted-foreground mb-2">
                Evaluate how candidates would handle scenarios
              </p>
              <p className="text-xs text-muted-foreground italic">
                "How would you prioritize if given three urgent deadlines?"
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-2">Cultural Fit Questions</div>
              <p className="text-sm text-muted-foreground mb-2">
                Assess alignment with company values
              </p>
              <p className="text-xs text-muted-foreground italic">
                "What type of work environment helps you thrive?"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creating Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Creating a Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Navigate to <strong>Questions</strong> from the sidebar
            </li>
            <li>
              Click the <strong>"New Question"</strong> button
            </li>
            <li>Enter the question text</li>
            <li>
              Click <strong>"Create Question"</strong> to save
            </li>
          </ol>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Write questions that are clear and
              open-ended. Avoid yes/no questions for better candidate
              evaluation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Linking Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Linking Questions to Rounds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            After creating questions, link them to round templates:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              Go to <strong>Rounds</strong> from the sidebar
            </li>
            <li>Select the round template you want to add questions to</li>
            <li>
              Click <strong>"Add Question"</strong>
            </li>
            <li>Select questions from the question bank</li>
          </ol>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> The same question can be linked to multiple
              round templates. This is useful for questions that apply across
              different interview stages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* During Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>Questions During Interviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">When recording an interview:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Questions from the selected round template are displayed</li>
            <li>Interviewers can add notes for each question</li>
            <li>Each question can be rated individually</li>
            <li>Feedback is saved with the interview record</li>
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
                Write clear, specific questions that elicit detailed responses
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use open-ended questions starting with "How", "What", "Tell me
                about"
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>Include a mix of technical and behavioral questions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Review and update questions periodically based on effectiveness
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Build a comprehensive library that covers all evaluation
                criteria
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Example Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Example Questions</CardTitle>
          <CardDescription>
            Sample questions for different interview stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="font-semibold text-sm text-muted-foreground mb-2">
                Phone Screen
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>"Walk me through your resume and career path."</li>
                <li>"Why are you interested in this role?"</li>
                <li>"What are your salary expectations?"</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm text-muted-foreground mb-2">
                Technical
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>"Describe a complex project you've worked on."</li>
                <li>"How do you approach debugging a difficult issue?"</li>
                <li>"What's your experience with [specific technology]?"</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-sm text-muted-foreground mb-2">
                Behavioral
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>"Tell me about a time you disagreed with a colleague."</li>
                <li>"Describe a situation where you had to learn quickly."</li>
                <li>"How do you handle tight deadlines and pressure?"</li>
              </ul>
            </div>
          </div>
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
