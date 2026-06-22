import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import type { QuestionOption } from "@workspace/db/question-types";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import InterviewTimer from "~/components/interview-timer";
import WelcomeScreen from "~/components/interview/welcome-screen";
import InstructionWizard from "~/components/interview/instruction-wizard";
import LobbyScreen from "~/components/interview/lobby-screen";
import PracticeInterview from "~/components/interview/practice-interview";
import VoiceRecorder from "~/components/interview/voice-recorder";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds: number | null;
  options?: QuestionOption[] | null;
}

interface SessionInfo {
  sessionId: string;
  candidateName: string;
  positionName: string;
  roundName: string;
}

interface InterviewData extends SessionInfo {
  startedAt: number | null;
  questions: Question[];
}

type AnswerValue =
  | { type: "text"; text: string }
  | { type: "mcq"; selectedOptionId: string };

type PageStatus =
  | "loading"
  | "invalid"
  | "welcome"
  | "instructions"
  | "lobby"
  | "practice"
  | "confirming"
  | "in_progress"
  | "completed";

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

  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState("");

  // Populated from /validate — available during welcome/instructions/lobby/confirming
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  // Populated from /schema — available only once the real interview starts
  const [data, setData] = useState<InterviewData | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  // Tracks which questions have a locked voice answer (textarea disabled)
  const [voiceUsed, setVoiceUsed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [startingInterview, setStartingInterview] = useState(false);

  // Always reflects latest answers — used by timer expire callback to avoid stale closures
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const answersKey = `interview-answers-${token}`;
  const timerKey = `interview-start-${token}`;

  // Auto-save every answer change to localStorage
  useEffect(() => {
    if (status !== "in_progress") return;
    localStorage.setItem(answersKey, JSON.stringify(answers));
  }, [answers, status, answersKey]);

  // Warn before closing the tab — only while actively interviewing
  useEffect(() => {
    if (status !== "in_progress") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  // On mount: validate the token, then branch based on existing session status
  useEffect(() => {
    let cancelled = false;

    async function loadSchema() {
      const schemaRes = await fetch(`/api/interview-token/${token}/schema`);
      if (!schemaRes.ok) {
        const body = (await schemaRes.json()) as { error?: string };
        if (!cancelled) {
          setStatus("invalid");
          setError(body.error ?? "Failed to load interview");
        }
        return;
      }
      const interviewData = (await schemaRes.json()) as InterviewData;
      if (!cancelled) {
        setData(interviewData);
        const origin = interviewData.startedAt
          ? new Date(interviewData.startedAt)
          : new Date();
        setStartedAt(origin);
        const savedAnswers = localStorage.getItem(answersKey);
        if (savedAnswers) {
          try {
            const parsed = JSON.parse(savedAnswers) as Record<string, AnswerValue>;
            if (Object.keys(parsed).length > 0) setAnswers(parsed);
          } catch {
            // Corrupt localStorage — ignore
          }
        }
        setStatus("in_progress");
      }
    }

    async function init() {
      try {
        const validateRes = await fetch(`/api/interview-token/${token}/validate`);
        if (!validateRes.ok) {
          const body = (await validateRes.json()) as { error?: string };
          if (!cancelled) {
            setStatus("invalid");
            setError(body.error ?? "Invalid interview link");
          }
          return;
        }
        const validateData = (await validateRes.json()) as {
          sessionId: string;
          status: string;
          candidateName: string;
          positionName: string;
          roundName: string;
        };
        if (cancelled) return;
        setSessionInfo({
          sessionId: validateData.sessionId,
          candidateName: validateData.candidateName,
          positionName: validateData.positionName,
          roundName: validateData.roundName,
        });
        if (validateData.status === "in_progress") {
          // Resuming after a refresh — skip onboarding, go straight to interview
          await loadSchema();
        } else {
          setStatus("welcome");
        }
      } catch {
        if (!cancelled) {
          setStatus("invalid");
          setError("Failed to connect. Please try again.");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Called when the candidate confirms "Start Interview" in the AlertDialog.
  // /schema marks the session in_progress in the DB and returns startedAt for the timer.
  const handleStartInterview = useCallback(async () => {
    setStartingInterview(true);
    try {
      const schemaRes = await fetch(`/api/interview-token/${token}/schema`);
      if (!schemaRes.ok) {
        const body = (await schemaRes.json()) as { error?: string };
        // 410 = expired or already completed; anything else is retryable
        if (schemaRes.status === 410) {
          setError(body.error ?? "This interview link is no longer available");
          setStatus("invalid");
        } else {
          setStatus("lobby");
        }
        return;
      }
      const interviewData = (await schemaRes.json()) as InterviewData;
      setData(interviewData);
      setStartedAt(
        interviewData.startedAt
          ? new Date(interviewData.startedAt)
          : new Date(),
      );
      setStatus("in_progress");
    } catch {
      // Network error — return to lobby so the candidate can try again
      setStatus("lobby");
    } finally {
      setStartingInterview(false);
    }
  }, [token]);

  const saveAnswer = useCallback(
    async (question: Question, answer: AnswerValue) => {
      if (!hasAnswer(answer)) return;
      setSaving(true);
      try {
        const body =
          answer.type === "mcq"
            ? {
                questionId: question.id,
                selectedOptionId: answer.selectedOptionId,
              }
            : { questionId: question.id, answerText: answer.text };
        await fetch(`/api/interview-token/${token}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // Non-fatal — localStorage already has the answer
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const handleTimerExpire = useCallback(async () => {
    if (!data || completing) return;
    setCompleting(true);
    try {
      const currentAnswers = answersRef.current;
      for (const question of data.questions) {
        const answer = currentAnswers[question.id];
        if (answer && hasAnswer(answer)) await saveAnswer(question, answer);
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
      setStatus("completed");
    } finally {
      setCompleting(false);
    }
  }, [data, completing, token, saveAnswer, answersKey, timerKey]);

  const handleNext = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    if (!question) return;
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) await saveAnswer(question, answer);
    if (currentStep < data.questions.length - 1) setCurrentStep((s) => s + 1);
  }, [data, currentStep, answers, saveAnswer]);

  const handlePrev = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    if (!question) return;
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) await saveAnswer(question, answer);
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [data, currentStep, answers, saveAnswer]);

  const handleComplete = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    if (!question) return;
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

  // ── Screens ────────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading interview…</p>
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
              Thank you for completing the interview. Your responses have been
              recorded.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "welcome" && sessionInfo) {
    return (
      <WelcomeScreen
        candidateName={sessionInfo.candidateName}
        positionName={sessionInfo.positionName}
        roundName={sessionInfo.roundName}
        onContinue={() => setStatus("instructions")}
      />
    );
  }

  if (status === "instructions") {
    return <InstructionWizard onFinish={() => setStatus("lobby")} />;
  }

  if (status === "lobby" && sessionInfo) {
    return (
      <LobbyScreen
        positionName={sessionInfo.positionName}
        onPractice={() => setStatus("practice")}
        onStartInterview={() => setStatus("confirming")}
        onViewInstructions={() => setStatus("instructions")}
      />
    );
  }

  // "Are you sure?" shown as a modal over the lobby — lobby still visible behind it
  if (status === "confirming" && sessionInfo) {
    return (
      <>
        <LobbyScreen
          positionName={sessionInfo.positionName}
          onPractice={() => setStatus("practice")}
          onStartInterview={() => setStatus("confirming")}
          onViewInstructions={() => setStatus("instructions")}
        />
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start your interview?</AlertDialogTitle>
              <AlertDialogDescription>
                Once you begin, your 30-minute timer starts immediately and
                cannot be paused. Make sure you are in a quiet environment with
                a stable internet connection.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStatus("lobby")}>
                Not yet
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleStartInterview}
                disabled={startingInterview}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {startingInterview && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Start Interview
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (status === "practice") {
    return (
      <PracticeInterview token={token} onFinish={() => setStatus("lobby")} />
    );
  }

  if (!data) return null;

  // ── Real interview ──────────────────────────────────────────────────────────

  const question = data.questions[currentStep];
  if (!question) return null;

  const isLast = currentStep === data.questions.length - 1;
  const progress = ((currentStep + 1) / data.questions.length) * 100;
  const currentAnswer = answers[question.id];
  const isMcq = question.questionType === "mcq";
  const isVoiceLocked = !!voiceUsed[question.id];

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{data.roundName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {data.positionName} — {data.candidateName}
            </p>
          </div>
          {startedAt && (
            <InterviewTimer
              durationMs={THIRTY_MINUTES_MS}
              startedAt={startedAt}
              token={token}
              onExpire={handleTimerExpire}
            />
          )}
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
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
            {question.category ?? "General"}
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

        <div className="flex-1 space-y-3">
          {isMcq ? (
            <RadioGroup
              value={
                currentAnswer?.type === "mcq"
                  ? currentAnswer.selectedOptionId
                  : ""
              }
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
            <>
              <Textarea
                value={
                  currentAnswer?.type === "text" ? currentAnswer.text : ""
                }
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: { type: "text", text: e.target.value },
                  }))
                }
                placeholder="Type your answer here…"
                className="min-h-[200px] resize-y text-base leading-relaxed"
                disabled={completing || isVoiceLocked}
              />
              {/* VoiceRecorder keyed by question id — fully resets on navigation */}
              <VoiceRecorder
                key={question.id}
                token={token}
                disabled={completing || isVoiceLocked}
                onTranscript={(text) => {
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: { type: "text", text },
                  }));
                  setVoiceUsed((prev) => ({ ...prev, [question.id]: true }));
                }}
                onTypeInstead={() => {
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: { type: "text", text: "" },
                  }));
                  setVoiceUsed((prev) => ({
                    ...prev,
                    [question.id]: false,
                  }));
                }}
              />
            </>
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
                if (!currentQ) return;
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
