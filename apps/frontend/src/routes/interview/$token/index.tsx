import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import type { QuestionOption } from "@workspace/db/question-types";
import type { DeliveryMode } from "@workspace/db/enums";
import DeliveryModePicker from "~/components/interview/DeliveryModePicker";
import VoiceInterview from "~/components/interview/VoiceInterview";
import { useVoiceInterview } from "~/hooks/useVoiceInterview";

import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ClipboardList,
  Wifi,
  Eye,
  Save,
  Mic,
  Maximize2,
  Volume2,
  Monitor,
} from "lucide-react";

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
  questions: Question[];
}

interface WelcomeData {
  candidateName: string;
  positionName: string;
  roundName: string;
  deliveryMode: DeliveryMode;
}

type SessionMode = "form" | "voice";

function getModeStorageKey(token: string) {
  return `interview-mode:${token}`;
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
  if (!answer) {
    return false;
  }

  if (answer.type === "text") {
    return answer.text.trim().length > 0;
  }

  return answer.selectedOptionId.length > 0;
}

async function loadInterviewSchema(token: string): Promise<InterviewData> {
  const schemaRes = await fetch(`/api/interview-token/${token}/schema`);
  if (!schemaRes.ok) {
    const body = await schemaRes.json();
    throw new Error(body.error || "Failed to load interview");
  }
  return schemaRes.json();
}

const INSTRUCTIONS = [
  {
    icon: ClipboardList,
    title: "Read each question carefully",
    description:
      "Take your time to understand what is being asked before answering.",
  },
  {
    icon: Save,
    title: "Your progress is saved automatically",
    description:
      "Answers are saved as you move between questions. You can go back to review or change responses.",
  },
  {
    icon: Wifi,
    title: "Use a stable internet connection",
    description:
      "Find a quiet place with reliable connectivity so you can focus without interruptions.",
  },
  {
    icon: Eye,
    title: "Stay on this tab during the interview",
    description:
      "Switching tabs or windows may be recorded. Keep this page open until you submit.",
  },
] as const;

const VOICE_INSTRUCTIONS = [
  {
    icon: Mic,
    title: "Use a working microphone",
    description:
      "You will speak your answers aloud. Allow microphone access when prompted and use a quiet environment.",
  },
  {
    icon: Monitor,
    title: "Share your entire screen",
    description:
      "When prompted, choose to share your full screen (with audio if available) and keep sharing until the interview ends.",
  },
  {
    icon: Maximize2,
    title: "Stay in fullscreen during the interview",
    description:
      "The interview runs in fullscreen mode. Exiting fullscreen may be recorded as a integrity signal.",
  },
  {
    icon: Volume2,
    title: "Listen to the AI interviewer",
    description:
      "Questions are asked one at a time by voice. Wait for the prompt, then answer clearly in your own words.",
  },
  {
    icon: Wifi,
    title: "Use a stable internet connection",
    description:
      "Voice interviews need reliable connectivity for real-time audio. Avoid switching networks mid-session.",
  },
  {
    icon: Eye,
    title: "Stay on this tab until you finish",
    description:
      "Do not switch tabs or windows during the interview. Tab changes and focus loss may be recorded.",
  },
] as const;

function WelcomeScreen({
  data,
  mode,
  onStart,
  starting,
}: {
  data: WelcomeData;
  mode: SessionMode;
  onStart: () => void;
  starting: boolean;
}) {
  const isVoice = mode === "voice";
  const instructions = isVoice ? VOICE_INSTRUCTIONS : INSTRUCTIONS;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-5">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Dark Alpha Capital
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {isVoice ? "Welcome to Your Voice Interview" : "Welcome to Your Interview"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Hi {data.candidateName}, thank you for taking the time to interview
            with us.
          </p>
          {isVoice ? (
            <Badge variant="secondary" className="mt-3">
              <Mic className="mr-1 size-3" />
              Voice interview
            </Badge>
          ) : null}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Interview Details</CardTitle>
            <CardDescription>
              Please confirm the information below before you begin.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">Position</span>
              <span className="font-medium text-right">{data.positionName}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">Round</span>
              <span className="font-medium text-right">{data.roundName}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">Candidate</span>
              <span className="font-medium text-right">{data.candidateName}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">Format</span>
              <span className="font-medium text-right">
                {isVoice ? "AI voice interview" : "Written responses"}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="text-lg font-medium">Before You Begin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isVoice
              ? "Review these voice interview instructions to ensure a smooth experience."
              : "Review these instructions to ensure a smooth interview experience."}
          </p>
          <ul className="mt-4 space-y-3">
            {instructions.map((item) => (
              <li
                key={item.title}
                className="flex gap-3 rounded-lg border p-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-8">
          <Button
            className="w-full sm:w-auto"
            size="lg"
            onClick={onStart}
            disabled={starting}
          >
            {starting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {isVoice ? "Connecting..." : "Preparing interview..."}
              </>
            ) : isVoice ? (
              <>
                <Mic className="mr-2 size-4" />
                Start Voice Interview
                <ArrowRight className="ml-2 size-4" />
              </>
            ) : (
              <>
                Start Interview
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            {isVoice
              ? "By clicking Start Voice Interview, you allow microphone access, fullscreen mode, and session recording."
              : "By clicking Start Interview, you confirm you are ready to begin and your session will be recorded."}
          </p>
        </div>
      </main>
    </div>
  );
}

function InterviewPage() {
  const { token } = Route.useParams();
  const [status, setStatus] = useState<
    | "loading"
    | "invalid"
    | "welcome"
    | "mode_picker"
    | "voice"
    | "in_progress"
    | "completed"
  >("loading");
  const [error, setError] = useState("");
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null);
  const [data, setData] = useState<InterviewData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode | null>(null);
  const answersRef = useRef(answers);
  const voiceInterview = useVoiceInterview(token);

  useEffect(() => {
    if (voiceInterview.state.status === "completed") {
      setStatus("completed");
    }
  }, [voiceInterview.state.status]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const validateRes = await fetch(
          `/api/interview-token/${token}/validate`,
        );
        if (!validateRes.ok) {
          const body = await validateRes.json();
          if (!cancelled) {
            setStatus("invalid");
            setError(body.error || "Invalid interview link");
          }
          return;
        }

        const validation = await validateRes.json();
        const storedMode = sessionStorage.getItem(
          getModeStorageKey(token),
        ) as SessionMode | null;

        if (validation.status === "in_progress") {
          if (storedMode === "voice") {
            if (!cancelled) {
              setWelcomeData({
                candidateName: validation.candidateName,
                positionName: validation.positionName,
                roundName: validation.roundName,
                deliveryMode: validation.deliveryMode,
              });
              setSessionMode("voice");
              if (
                voiceInterview.state.status === "active" ||
                voiceInterview.state.status === "connecting"
              ) {
                setStatus("voice");
              } else {
                setStatus("welcome");
              }
            }
            return;
          }

          const interviewData = await loadInterviewSchema(token);
          if (!cancelled) {
            setData(interviewData);
            setStatus("in_progress");
          }
          return;
        }

        if (!cancelled) {
          const welcome: WelcomeData = {
            candidateName: validation.candidateName,
            positionName: validation.positionName,
            roundName: validation.roundName,
            deliveryMode: validation.deliveryMode,
          };
          setWelcomeData(welcome);

          if (storedMode === "voice") {
            setSessionMode("voice");
            setStatus("welcome");
          } else if (storedMode === "form") {
            setSessionMode("form");
            setStatus("welcome");
          } else if (validation.deliveryMode === "voice") {
            sessionStorage.setItem(getModeStorageKey(token), "voice");
            setSessionMode("voice");
            setStatus("welcome");
          } else if (validation.deliveryMode === "form") {
            sessionStorage.setItem(getModeStorageKey(token), "form");
            setSessionMode("form");
            setStatus("welcome");
          } else {
            setStatus("mode_picker");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("invalid");
          setError(
            err instanceof Error
              ? err.message
              : "Failed to connect. Please try again.",
          );
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleStartInterview = useCallback(async () => {
    setStarting(true);
    try {
      const interviewData = await loadInterviewSchema(token);
      setData(interviewData);
      setStatus("in_progress");
    } catch (err) {
      setStatus("invalid");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start interview. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  }, [token]);

  const saveAnswer = useCallback(
    async (question: Question, answer: AnswerValue) => {
      if (!hasAnswer(answer)) {
        return;
      }

      setSaving(true);
      try {
        const body =
          answer.type === "mcq"
            ? {
                questionId: question.id,
                selectedOptionId: answer.selectedOptionId,
              }
            : {
                questionId: question.id,
                answerText: answer.text,
              };

        await fetch(`/api/interview-token/${token}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        // continue regardless
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const handleNext = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) {
      await saveAnswer(question, answer);
    }
    if (currentStep < data.questions.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [data, currentStep, answers, saveAnswer]);

  const handlePrev = useCallback(async () => {
    if (!data) return;

    const question = data.questions[currentStep];
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) {
      await saveAnswer(question, answer);
    }
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [data, currentStep, answers, saveAnswer]);

  const handleComplete = useCallback(async () => {
    if (!data) return;
    const question = data.questions[currentStep];
    const answer = answers[question.id];
    if (answer && hasAnswer(answer)) {
      await saveAnswer(question, answer);
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

  const handleSelectForm = useCallback(() => {
    sessionStorage.setItem(getModeStorageKey(token), "form");
    setSessionMode("form");
    setStatus("welcome");
  }, [token]);

  const handleSelectVoice = useCallback(() => {
    sessionStorage.setItem(getModeStorageKey(token), "voice");
    setSessionMode("voice");
    setStatus("welcome");
  }, [token]);

  const handleStartVoiceInterview = useCallback(async () => {
    setStarting(true);
    sessionStorage.setItem(getModeStorageKey(token), "voice");
    setSessionMode("voice");
    setStatus("voice");
    try {
      await voiceInterview.start();
    } finally {
      setStarting(false);
    }
  }, [token, voiceInterview]);

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
              Thank you for completing the interview. Your responses have been
              recorded.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "mode_picker") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <DeliveryModePicker
          onSelectForm={handleSelectForm}
          onSelectVoice={handleSelectVoice}
        />
      </div>
    );
  }

  if (status === "voice" && welcomeData) {
    return (
      <VoiceInterview
        candidateName={welcomeData.candidateName}
        positionName={welcomeData.positionName}
        roundName={welcomeData.roundName}
        state={voiceInterview.state}
        videoStreamRef={voiceInterview.videoStreamRef}
        onStart={voiceInterview.start}
        onEnd={voiceInterview.endInterview}
      />
    );
  }

  if (status === "welcome" && welcomeData && sessionMode) {
    return (
      <WelcomeScreen
        data={welcomeData}
        mode={sessionMode}
        onStart={
          sessionMode === "voice"
            ? handleStartVoiceInterview
            : handleStartInterview
        }
        starting={starting}
      />
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
            />
          )}
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
              <Button onClick={handleNext} disabled={saving} size="sm">
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
