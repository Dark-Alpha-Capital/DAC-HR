import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { getInterviewByToken } from "@workspace/db/repositories/interview-repository";
import InterviewTimer from "@/components/interview-timer";
import {
  startCandidateInterview,
  submitCandidateInterview,
} from "@/lib/actions/submit-candidate-interview";

export const Route = createFileRoute("/interview/$token")({
  head: () => ({
    meta: [{ title: "Interview - DAC HR" }],
  }),
  loader: async ({ params }) => {
    const interviewData = await getInterviewByToken(params.token);
    return { interviewData };
  },
  component: CandidateInterviewPage,
});

type Phase = "not_started" | "starting" | "in_progress" | "submitting" | "submitted";

function CandidateInterviewPage() {
  const { token } = Route.useParams();
  const { interviewData } = Route.useLoaderData();

  const [phase, setPhase] = useState<Phase>(() => {
    if (!interviewData) return "not_started";
    if (interviewData.candidateSubmittedAt) return "submitted";
    if (interviewData.candidateStartedAt) return "in_progress";
    return "not_started";
  });

  const [startedAt, setStartedAt] = useState<Date | null>(
    interviewData?.candidateStartedAt ?? null,
  );

  const responsesKey = `interview-responses-${token}`;
  // Start empty to match SSR output — hydrate from localStorage after mount.
  const [responses, setResponses] = useState<Record<string, string>>({});

  // On mount: restore any partially-typed answers from localStorage (page refresh recovery).
  // On every change: re-save so the latest keystroke is always persisted.
  useEffect(() => {
    const saved = localStorage.getItem(responsesKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, string>;
        if (Object.keys(parsed).length > 0) setResponses(parsed);
      } catch {
        // ignore corrupt data
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "in_progress" && phase !== "submitting") return;
    localStorage.setItem(responsesKey, JSON.stringify(responses));
  }, [responses, phase, responsesKey]);

  // Derived: is the link expired?
  const isExpired =
    interviewData?.linkExpiresAt != null &&
    new Date(interviewData.linkExpiresAt) < new Date();

  const handleStart = async () => {
    setPhase("starting");
    try {
      const result = await startCandidateInterview(token);
      if ("error" in result) {
        if (result.error === "link_expired") {
          setPhase("not_started");
          toast.error("This interview link has expired.");
          return;
        }
        if (result.error === "already_submitted") {
          setPhase("submitted");
          return;
        }
        setPhase("not_started");
        toast.error("Failed to start interview. Please try again.");
        return;
      }
      setStartedAt(new Date(result.candidateStartedAt));
      setPhase("in_progress");
    } catch {
      setPhase("not_started");
      toast.error("Failed to start interview. Please try again.");
    }
  };

  const handleSubmit = useCallback(async () => {
    if (phase === "submitting" || phase === "submitted") return;
    setPhase("submitting");

    const responseList = Object.entries(responses).map(
      ([questionId, answer]) => ({ questionId, answer }),
    );

    try {
      const result = await submitCandidateInterview(token, responseList);
      if ("error" in result) {
        if (result.error === "already_submitted") {
          setPhase("submitted");
          return;
        }
        setPhase("in_progress");
        toast.error("Submission failed. Please try again.");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem(`interview-start-${token}`);
        localStorage.removeItem(responsesKey);
      }
      setPhase("submitted");
    } catch {
      setPhase("in_progress");
      toast.error("Submission failed. Please try again.");
    }
  }, [token, responses, phase, responsesKey]);

  // Invalid token
  if (!interviewData) {
    return (
      <InterviewPageShell>
        <StatusCard
          icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
          title="Invalid Link"
          description="This interview link is not valid or has been removed."
        />
      </InterviewPageShell>
    );
  }

  // Link expired (server-side check)
  if (isExpired && phase === "not_started") {
    return (
      <InterviewPageShell>
        <StatusCard
          icon={<Clock className="h-10 w-10 text-muted-foreground" />}
          title="Link Expired"
          description="This interview link has expired. Please contact your recruiter."
        />
      </InterviewPageShell>
    );
  }

  // Already submitted (from loader or after submit)
  if (phase === "submitted") {
    return (
      <InterviewPageShell>
        <StatusCard
          icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />}
          title="Interview Submitted"
          description="Your interview has been submitted. We'll be in touch soon."
          titleClassName="text-emerald-700 dark:text-emerald-400"
        />
      </InterviewPageShell>
    );
  }

  const { roundTemplate, questions } = interviewData;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky timer bar */}
      {(phase === "in_progress" || phase === "submitting") && startedAt && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            {roundTemplate.name}
          </span>
          <InterviewTimer
            durationMs={30 * 60 * 1000}
            startedAt={startedAt}
            token={token}
            onExpire={handleSubmit}
          />
          <Button
            onClick={handleSubmit}
            disabled={phase === "submitting"}
            size="sm"
          >
            {phase === "submitting" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit
          </Button>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Dark Alpha Capital
          </p>
          <h1 className="text-2xl font-bold">{roundTemplate.name}</h1>
          {roundTemplate.description && (
            <p className="text-muted-foreground text-sm">
              {roundTemplate.description}
            </p>
          )}
        </div>

        {/* Not started */}
        {(phase === "not_started" || phase === "starting") && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to begin?</CardTitle>
              <CardDescription>
                This interview has {questions.length} question
                {questions.length !== 1 ? "s" : ""} and a{" "}
                <span className="font-medium">30-minute time limit</span>. The
                timer starts when you click "Start Interview" and cannot be
                paused.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleStart}
                disabled={phase === "starting"}
                className="w-full"
                size="lg"
              >
                {phase === "starting" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Interview
              </Button>
            </CardContent>
          </Card>
        )}

        {/* In progress */}
        {(phase === "in_progress" || phase === "submitting") && (
          <div className="space-y-6">
            {(questions as Array<{ id: string; questionText: string }>).map((q, i) => (
              <Card key={q.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">
                    {i + 1}. {q.questionText}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={responses[q.id] ?? ""}
                    onChange={(e) =>
                      setResponses((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    placeholder="Your answer..."
                    rows={5}
                    disabled={phase === "submitting"}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={handleSubmit}
              disabled={phase === "submitting"}
              className="w-full"
              size="lg"
            >
              {phase === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Interview"
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function InterviewPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-8">
        Dark Alpha Capital
      </p>
      {children}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  titleClassName,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  titleClassName?: string;
}) {
  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader className="items-center gap-3">
        {icon}
        <CardTitle className={titleClassName}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
