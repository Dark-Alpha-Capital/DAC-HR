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
  CircleDot,
  Plus,
  ArrowRight,
  CheckCircle2,
  Settings,
  HelpCircle,
  Briefcase,
  Link as LinkIcon,
} from "lucide-react";



export function RoundsDocsPage() {
  return (
    <div className="space-y-8">
      <DocsBreadcrumb />

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
            <CircleDot className="h-6 w-6 text-pink-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Interview Rounds
          </h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Round templates define the stages of your interview process. Create
          reusable templates and link them to positions.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What is a Round Template?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            A round template is a blueprint for an interview stage. It defines:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Name</strong> - The type of interview (e.g., "Phone
              Screen", "Technical Interview")
            </li>
            <li>
              <strong>Description</strong> - Details about what this round
              evaluates
            </li>
            <li>
              <strong>Questions</strong> - The set of questions to ask
              candidates
            </li>
            <li>
              <strong>Position Links</strong> - Which positions use this round
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* How Rounds Work */}
      <Card>
        <CardHeader>
          <CardTitle>How Rounds Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                1
              </div>
              <div>
                <div className="font-semibold">Create Round Templates</div>
                <p className="text-sm text-muted-foreground">
                  Define your interview stages (Phone Screen, Technical,
                  Cultural Fit, etc.)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                2
              </div>
              <div>
                <div className="font-semibold">Link to Positions</div>
                <p className="text-sm text-muted-foreground">
                  Associate round templates with positions that need those
                  interview stages
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                3
              </div>
              <div>
                <div className="font-semibold">Add Questions</div>
                <p className="text-sm text-muted-foreground">
                  Attach questions from the question bank to each round template
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                4
              </div>
              <div>
                <div className="font-semibold">Conduct Interviews</div>
                <p className="text-sm text-muted-foreground">
                  When recording an interview, select the round template to use
                  its questions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Round Types */}
      <Card>
        <CardHeader>
          <CardTitle>Common Round Types</CardTitle>
          <CardDescription>
            Typical interview stages you might create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Phone Screen</div>
              <p className="text-sm text-muted-foreground">
                Initial screening call to assess basic qualifications and
                interest
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Technical Interview</div>
              <p className="text-sm text-muted-foreground">
                Assess technical skills, problem-solving, and domain knowledge
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Behavioral Interview</div>
              <p className="text-sm text-muted-foreground">
                Evaluate soft skills, teamwork, and past experiences
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Cultural Fit</div>
              <p className="text-sm text-muted-foreground">
                Assess alignment with company values and team dynamics
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Final Round</div>
              <p className="text-sm text-muted-foreground">
                Senior leadership interview and final evaluation
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="font-semibold mb-1">Case Study</div>
              <p className="text-sm text-muted-foreground">
                Present and solve a business case or technical challenge
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creating Rounds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Creating a Round Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Navigate to <strong>Rounds</strong> from the sidebar
            </li>
            <li>
              Click the <strong>"New Round"</strong> button
            </li>
            <li>
              Enter the round details:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Name (e.g., "Technical Interview")</li>
                <li>Description (what this round evaluates)</li>
              </ul>
            </li>
            <li>
              Click <strong>"Create Round"</strong> to save
            </li>
            <li>
              After creation, link the round to positions and add questions
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Linking to Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Linking Rounds to Positions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            A round template must be linked to a position before it can be used
            for interviews:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to the round template's detail page</li>
            <li>Find the "Linked Positions" section</li>
            <li>Click "Link Position"</li>
            <li>Select the position(s) to link</li>
          </ol>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> The same round template can be linked to
              multiple positions. For example, a "Phone Screen" round can be
              used for all open positions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Adding Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Adding Questions to Rounds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Each round template can have multiple questions from the question
            bank:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Go to the round template's detail page</li>
            <li>Click "Add Question"</li>
            <li>Select questions from the question bank</li>
            <li>Questions will be displayed during interview recording</li>
          </ol>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Create questions in the Question Bank first,
              then link them to round templates. Questions can be reused across
              multiple rounds.
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
                Create generic round templates that can be reused across
                positions
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Use clear, descriptive names that indicate the interview stage
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Add descriptions to help interviewers understand the round's
                purpose
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Include 5-10 questions per round for comprehensive evaluation
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <span>
                Set up all rounds for a position before starting interviews
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
              to="/docs/questions"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Questions</span>
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
