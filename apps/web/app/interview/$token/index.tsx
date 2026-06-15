import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { Label } from "@workspace/ui/components/label";
import type { QuestionOption } from "@workspace/db/question-types";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import InterviewTimer from "@/components/interview-timer";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds: number | null;
  options?: QuestionOption[] | null;
}

interface InterviewData {
  sessionId: string;
  candidateName: string;
  positionName: string;
  roundName: string;
  // Epoch ms of when the candidate first clicked Start — used to anchor the timer.
  // Null only if something went wrong server-side; treated as "just now" in that case.
  startedAt: number | null;
  questions: Question[];
}

type AnswerValue =
  | { type: "text"; text: string }
  | { type: "mcq"; selectedOptionId: string };

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

function hasAnswer(answer: AnswerValue | undefined): boolean {
  if (!answer) return false;
  if (answer.type === "text") return answer.text.trim().length > 0;
  return answer.selectedOptionId.length > 0;
}

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function InterviewPage() {
  const { token } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "invalid" | "in_progress" | "completed">("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState<InterviewData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  // Always reflects latest answers — used by timer expire callback to avoid stale closures.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // localStorage keys scoped to this token so multiple tabs/interviews don't collide.
  const answersKey = `interview-answers-${token}`;
  const timerKey = `interview-start-${token}`;

  // Auto-save every answer change to localStorage immediately.
  // This runs on every keystroke so even if the timer fires a millisecond later,
  // whatever the candidate typed is already persisted.
  useEffect(() => {
    if (status !== "in_progress") return;
    localStorage.setItem(answersKey, JSON.stringify(answers));
  }, [answers, status, answersKey]);

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

        const interviewData: InterviewData = await schemaRes.json();

        if (!cancelled) {
          setData(interviewData);

          // Set the timer origin. The server returns the DB-recorded startedAt
          // so page refresh always resumes from the real start time, not "now".
          const origin = interviewData.startedAt
            ? new Date(interviewData.startedAt)
            : new Date();
          setStartedAt(origin);

          // Restore any answers the candidate had typed before a page refresh.
          // We do this AFTER getting the schema so we know the question IDs.
          const savedAnswers = localStorage.getItem(answersKey);
          if (savedAnswers) {
            try {
              const parsed = JSON.parse(savedAnswers) as Record<string, AnswerValue>;
              if (Object.keys(parsed).length > 0) {
                setAnswers(parsed);
              }
            } catch {
              // Corrupt localStorage — ignore and start fresh.
            }
          }

          setStatus("in_progress");
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
  }, [token, answersKey]);

  const saveAnswer = useCallback(async (question: Question, answer: AnswerValue) => {
    if (!hasAnswer(answer)) return;
    setSaving(true);
    try {
      const body =
        answer.type === "mcq"
          ? { questionId: question.id, selectedOptionId: answer.selectedOptionId }
          : { questionId: question.id, answerText: answer.text };

      await fetch(`/api/interview-token/${token}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // Network errors are non-fatal — localStorage already has the answer.
    } finally {
      setSaving(false);
    }
  }, [token]);

  // Flushes ALL current answers to the API, then marks the session complete.
  // Used by both the timer (auto-submit on expiry) and the Submit button (manual).
  // Uses answersRef so the timer callback always sees the latest typed text
  // even though it was set up before those keystrokes happened.
  const handleTimerExpire = useCallback(async () => {
    if (!data || completing) return;
    setCompleting(true);
    try {
      // Save every question that has an answer — not just the current one.
      const currentAnswers = answersRef.current;
      for (const question of data.questions) {
        const answer = currentAnswers[question.id];
        if (answer && hasAnswer(answer)) {
          await saveAnswer(question, answer);
        }
      }
      await fetch(`/api/interview-token/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabSwitches: tabSwitchCount }),
      });
      localStorage.removeItem(answersKey);
      localStorage.removeItem(timerKey);
      setStatus("completed");
    } catch {
      // Even if the complete call fails, the answers were saved above.
      setStatus("completed");
    } finally {
      setCompleting(false);
    }
  }, [data, completing, token, saveAnswer, answersKey, timerKey]);

  const handleNext = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) await saveAnswer(question, answer);
    if (currentStep < data.questions.length - 1) setCurrentStep((s) => s + 1);
  }, [data, currentStep, answers, saveAnswer]);

  const handlePrev = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) await saveAnswer(question, answer);
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [data, currentStep, answers, saveAnswer]);

  const handleComplete = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) await saveAnswer(question, answer);
    setCompleting(true);
    try {
      await fetch(`/api/interview-token/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabSwitches: tabSwitchCount }),
      });
      localStorage.removeItem(answersKey);
      localStorage.removeItem(timerKey);
      setStatus("completed");
    } catch {
      // continue
    } finally {
      setCompleting(false);
    }
  }, [data, currentStep, answers, saveAnswer, token, answersKey, timerKey]);

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
  const currentAnswer = answers[question.id];
  const isMcq = question.questionType === "mcq";

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
          {/* 30-minute countdown. Completely independent of link expiry —
              once the candidate is here, only this timer governs. */}
          {startedAt && (
            <InterviewTimer
              durationMs={THIRTY_MINUTES_MS}
              startedAt={startedAt}
              token={token}
              onExpire={handleTimerExpire}
            />
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span>{currentStep + 1} / {data.questions.length}</span>
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
          {isMcq ? (
            <RadioGroup
              value={currentAnswer?.type === "mcq" ? currentAnswer.selectedOptionId : ""}
              onValueChange={(selectedOptionId) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: { type: "mcq", selectedOptionId },
                }))
              }
              disabled={completing}
              className="space-y-3"
            >
              {(question.options ?? []).map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Textarea
              value={currentAnswer?.type === "text" ? currentAnswer.text : ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: { type: "text", text: e.target.value },
                }))
              }
              placeholder="Type your answer here..."
              className="min-h-[200px] resize-y text-base leading-relaxed"
              disabled={completing}
            />
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
          <Button
            variant="secondary"
            onClick={handlePrev}
            disabled={currentStep === 0 || saving || completing}
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
                disabled={saving || completing}
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
                const currentA = answersRef.current[currentQ.id];
                if (currentA && hasAnswer(currentA)) {
                  await saveAnswer(currentQ, currentA);
                }
                setCurrentStep(i);
              }}
              className={`flex size-7 items-center justify-center rounded text-xs font-medium transition-colors ${
                i === currentStep
                  ? "bg-primary text-primary-foreground"
                  : hasAnswer(answers[q.id])
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
