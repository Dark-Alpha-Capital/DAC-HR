import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";

import { Clock, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds: number | null;
}

interface InterviewData {
  sessionId: string;
  candidateName: string;
  positionName: string;
  roundName: string;
  questions: Question[];
}

let tabSwitchCount = 0;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) tabSwitchCount++;
  });
}

export const Route = createFileRoute("/interview/$token/")({
  head: () => ({
    meta: [{ title: "Interview - DAC-HR" }],
  }),
  component: InterviewPage,
});

function InterviewPage() {
  const { token } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "invalid" | "ready" | "in_progress" | "completed">("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState<InterviewData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const validateRes = await fetch(`/api/interview-token/${token}/validate`);
        if (!validateRes.ok) {
          const body = await validateRes.json();
          if (!cancelled) {
            setStatus("invalid");
            setError(body.error || "Invalid interview link");
          }
          return;
        }

        const schemaRes = await fetch(`/api/interview-token/${token}/schema`);
        if (!schemaRes.ok) {
          const body = await schemaRes.json();
          if (!cancelled) {
            setStatus("invalid");
            setError(body.error || "Failed to load interview");
          }
          return;
        }

        const interviewData = await schemaRes.json();
        if (!cancelled) {
          setData(interviewData);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("invalid");
          setError("Failed to connect. Please try again.");
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [token]);

  const saveAnswer = useCallback(async (questionId: string, answerText: string) => {
    setSaving(true);
    try {
      await fetch(`/api/interview-token/${token}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answerText }),
      });
    } catch {
      // continue regardless
    } finally {
      setSaving(false);
    }
  }, [token]);

  const handleNext = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id] || "";
    if (answer.trim()) {
      await saveAnswer(question.id, answer);
    }
    if (currentStep < data.questions.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [data, currentStep, answers, saveAnswer]);

  const handlePrev = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id] || "";
    if (answer.trim()) {
      await saveAnswer(question.id, answer);
    }
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [data, currentStep, answers, saveAnswer]);

  const handleComplete = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id] || "";
    if (answer.trim()) {
      await saveAnswer(question.id, answer);
    }
    setCompleting(true);
    try {
      await fetch(`/api/interview-token/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabSwitches: tabSwitchCount }),
      });
      setStatus("completed");
    } catch {
      // continue
    } finally {
      setCompleting(false);
    }
  }, [data, currentStep, answers, saveAnswer, token]);

  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-5 text-destructive" />
            </div>
            <CardTitle className="mt-3">Interview Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-5 text-primary" />
            </div>
            <CardTitle className="mt-3">Interview Completed</CardTitle>
            <CardDescription>
              Thank you for completing the interview. Your responses have been recorded.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const question = data.questions[currentStep];
  const isLast = currentStep === data.questions.length - 1;
  const progress = ((currentStep + 1) / data.questions.length) * 100;
  const currentAnswer = answers[question.id] || "";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-semibold">{data.roundName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {data.positionName} — {data.candidateName}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <Clock className="size-3.5" />
            <span>
              {currentStep + 1} / {data.questions.length}
            </span>
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div className="mb-6">
          <Badge variant="secondary" className="mb-2">
            {question.category || "General"}
          </Badge>
          <h2 className="text-lg font-medium leading-relaxed">
            {question.questionText}
          </h2>
          {question.timeLimitSeconds && (
            <p className="mt-1 text-xs text-muted-foreground">
              Suggested time: {Math.ceil(question.timeLimitSeconds / 60)} min
            </p>
          )}
        </div>

        <div className="flex-1">
          <Textarea
            value={currentAnswer}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
            }
            placeholder="Type your answer here..."
            className="min-h-[200px] resize-y text-base leading-relaxed"
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0 || saving}
            size="sm"
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {isLast ? (
              <Button
                onClick={handleComplete}
                disabled={completing || saving}
                size="sm"
              >
                {completing ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-4" />
                )}
                Submit Interview
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={saving}
                size="sm"
              >
                Next
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          {data.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={async () => {
                const currentQ = data.questions[currentStep];
                const currentA = answers[currentQ.id] || "";
                if (currentA.trim()) {
                  await saveAnswer(currentQ.id, currentA);
                }
                setCurrentStep(i);
              }}
              className={`flex size-7 items-center justify-center rounded text-xs font-medium transition-colors ${
                i === currentStep
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
