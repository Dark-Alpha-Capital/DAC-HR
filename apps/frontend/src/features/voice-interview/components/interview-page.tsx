import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "#/components/ui/card";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Label } from "#/components/ui/label";
import DeliveryModePicker from "#/features/voice-interview/components/delivery-mode-picker";
import VoiceInterview from "#/features/voice-interview/components/voice-interview";
import RoundTransitionSlide from "#/features/voice-interview/components/round-transition-slide";
import CompletionScreen from "#/features/voice-interview/components/completion-screen";
import TabSwitchWarning from "#/features/voice-interview/components/tab-switch-warning";
import { useVoiceInterview } from "#/hooks/useVoiceInterview";
import { useTabSwitchDetection } from "#/hooks/useTabSwitchDetection";
import {
  buildWelcomeFromValidation,
  completeInterview,
  getModeStorageKey,
  interviewSchemaOptions,
  interviewTokenValidateOptions,
  resolveSessionMode,
  type InterviewQuestion,
  type InterviewSchemaData,
  type WelcomeData,
} from "#/features/voice-interview/interview-token";
import {
  FIRST_FORM_QUESTION_INDEX,
  formatUnansweredQuestionLabel,
  hasFormAnswer,
  unansweredFormQuestionIndexes,
  type FormAnswerValue,
} from "#/features/voice-interview/form-interview";
import {
  planNextRoundFromValidation,
  planRoundTransition,
  type RoundTransitionData,
  type SessionMode,
} from "#/features/voice-interview/interview-flow";
import { logInterview, truncateId } from "#/features/voice-interview/interview-debug-log";
import { cn } from "#/lib/utils";

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
  GraduationCap,
  BookOpen,
  Video,
  Timer,
} from "lucide-react";

type Question = InterviewQuestion;
type InterviewData = InterviewSchemaData;
type AnswerValue = FormAnswerValue;

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
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
    title: "Share this interview tab",
    description:
      "When prompted, confirm sharing this tab (it should be pre-selected). Keep sharing until the interview ends.",
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

type VoiceWelcomeStep = "welcome" | "instructions" | "landing";

function VoiceWelcomeHeader() {
  return (
    <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:text-sm">
          Dark Alpha Capital
        </p>
      </div>
    </header>
  );
}

function VoiceWelcomeSlide({
  data,
  step,
  onContinue,
  onBack,
}: {
  data: WelcomeData;
  step: "welcome" | "instructions";
  onContinue: () => void;
  onBack?: () => void;
}) {
  if (step === "welcome") {
    return (
      <div className="flex h-svh flex-col overflow-hidden bg-background">
        <VoiceWelcomeHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 min-h-0 flex-col gap-5 overflow-y-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Welcome to Your Voice Interview
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Hi {data.candidateName}, thank you for taking the time to
              interview with us.
            </p>
            <Badge variant="secondary" className="mt-3">
              <Mic className="mr-1 size-3" />
              Voice interview
            </Badge>
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="text-muted-foreground">
              Position:{" "}
              <span className="font-medium text-foreground">
                {data.positionName}
              </span>
            </p>
            <p className="text-muted-foreground">
              Interview:{" "}
              <span className="font-medium text-foreground">
                {data.roundName}
              </span>
            </p>
            {data.interviewType === "bundle" && data.rounds ? (
              <p className="text-muted-foreground">
                Parts:{" "}
                <span className="font-medium text-foreground">
                  {data.rounds.length} ({data.rounds
                    .map((round) =>
                      round.deliveryMode === "voice"
                        ? "voice"
                        : "multiple choice",
                    )
                    .join(" + ")})
                </span>
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Format:{" "}
              <span className="font-medium text-foreground">
                AI video interview
              </span>
            </p>
          </div>

          <Button className="w-full sm:w-auto" size="lg" onClick={onContinue}>
            Continue
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <VoiceWelcomeHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-5 overflow-y-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-lg font-medium sm:text-xl">Before You Begin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review these voice interview instructions to ensure a smooth
            experience.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VOICE_INSTRUCTIONS.map((item) => (
            <li key={item.title} className="flex gap-2.5 rounded-lg border p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="size-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-snug sm:text-sm">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {onBack ? (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          ) : null}
          <Button size="lg" onClick={onContinue}>
            Continue
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}

function VoiceLandingScreen({
  data,
  onStartInterview,
  onStartPractice,
  onViewInstructions,
  starting,
  practiceStarting,
}: {
  data: WelcomeData;
  onStartInterview: () => void;
  onStartPractice: () => void;
  onViewInstructions: () => void;
  starting: boolean;
  practiceStarting: boolean;
}) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <VoiceWelcomeHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            You&apos;re All Set
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.candidateName}, choose how you&apos;d like to proceed with
            your {data.positionName} interview.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            className="h-auto w-full justify-start px-4 py-4"
            size="lg"
            onClick={onStartInterview}
            disabled={starting || practiceStarting}
          >
            <Video className="mr-3 size-5 shrink-0" />
            <span className="text-left">
              <span className="block font-medium">Start Video Interview</span>
              <span className="block text-xs font-normal opacity-80">
                Begin your recorded interview session
              </span>
            </span>
            {starting ? (
              <Loader2 className="ml-auto size-4 animate-spin" />
            ) : (
              <ArrowRight className="ml-auto size-4" />
            )}
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start px-4 py-4"
            size="lg"
            onClick={onViewInstructions}
            disabled={starting || practiceStarting}
          >
            <BookOpen className="mr-3 size-5 shrink-0" />
            <span className="text-left">
              <span className="block font-medium">View Instructions Again</span>
              <span className="block text-xs font-normal opacity-80">
                Review setup and environment tips
              </span>
            </span>
          </Button>

          <Button
            variant="secondary"
            className="h-auto w-full justify-start px-4 py-4"
            size="lg"
            onClick={onStartPractice}
            disabled={starting || practiceStarting}
          >
            <GraduationCap className="mr-3 size-5 shrink-0" />
            <span className="text-left">
              <span className="block font-medium">
                Practice Interview Session
              </span>
              <span className="block text-xs font-normal opacity-80">
                Try sample questions — not recorded for evaluation
              </span>
            </span>
            {practiceStarting ? (
              <Loader2 className="ml-auto size-4 animate-spin" />
            ) : null}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Starting the video interview allows microphone access, tab recording,
          and fullscreen mode.
        </p>
      </main>
    </div>
  );
}

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
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:text-sm">
            Dark Alpha Capital
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 min-h-0 flex-col gap-5 overflow-y-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {isVoice
              ? "Welcome to Your Video Interview"
              : "Welcome to Your Interview"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hi {data.candidateName}, thank you for taking the time to interview
            with us.
          </p>
          {isVoice ? (
            <Badge variant="secondary" className="mt-3">
              <Mic className="mr-1 size-3" />
              Video interview
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="text-muted-foreground">
            Position:{" "}
            <span className="font-medium text-foreground">
              {data.positionName}
            </span>
          </p>
          <p className="text-muted-foreground">
            Interview:{" "}
            <span className="font-medium text-foreground">
              {data.roundName}
            </span>
          </p>
          {data.interviewType === "bundle" && data.rounds ? (
            <p className="text-muted-foreground">
              Parts:{" "}
              <span className="font-medium text-foreground">
                {data.rounds.length} ({data.rounds
                  .map((round) =>
                    round.deliveryMode === "voice"
                      ? "voice"
                      : "multiple choice",
                  )
                  .join(" + ")})
              </span>
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Format:{" "}
            <span className="font-medium text-foreground">
              {isVoice ? "AI video interview" : "Written responses"}
            </span>
          </p>
        </div>

        <div>
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
                <Video className="mr-2 size-4" />
                Start Video Interview
                <ArrowRight className="ml-2 size-4" />
              </>
            ) : (
              <>
                Start Interview
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {isVoice
              ? "By clicking Start Video Interview, you allow microphone access, this tab to be recorded, and fullscreen mode."
              : "By clicking Start Interview, you confirm you are ready to begin and your session will be recorded."}
          </p>
        </div>

        <div>
          <h2 className="text-base font-medium sm:text-lg">
            Before You Begin
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {isVoice
              ? "Review these voice interview instructions to ensure a smooth experience."
              : "Review these instructions to ensure a smooth interview experience."}
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {instructions.map((item) => (
              <li key={item.title} className="flex gap-2.5 rounded-lg border p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug sm:text-sm">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export function InterviewPage() {
  const { token } = useParams({ from: "/interview/$token/" });
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<
    | "loading"
    | "invalid"
    | "welcome"
    | "mode_picker"
    | "voice"
    | "in_progress"
    | "round_complete"
    | "completed"
  >("loading");
  const [error, setError] = useState("");
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null);
  const [data, setData] = useState<InterviewData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [practiceStarting, setPracticeStarting] = useState(false);
  const [voiceWelcomeStep, setVoiceWelcomeStep] =
    useState<VoiceWelcomeStep>("welcome");
  const [sessionMode, setSessionMode] = useState<SessionMode | null>(null);
  const [roundTransition, setRoundTransition] =
    useState<RoundTransitionData | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabSwitchWarningVisible, setTabSwitchWarningVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const answersRef = useRef(answers);
  const wasPracticeSessionRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const prevPageStatusRef = useRef(status);
  const tabSwitchCountRef = useRef(0);
  const voiceInterview = useVoiceInterview(token);

  const {
    data: validation,
    isPending: isValidating,
    isError: isValidationError,
    error: validationError,
    refetch: refetchValidation,
  } = useQuery(interviewTokenValidateOptions(token));

  const resolvedMode = validation
    ? resolveSessionMode(validation, token)
    : null;

  const needsInitSchema =
    validation?.status === "in_progress" && resolvedMode === "form";

  const {
    data: schemaData,
    isPending: isSchemaLoading,
    isError: isSchemaError,
    error: schemaError,
  } = useQuery({
    ...interviewSchemaOptions(token, validation?.sessionId ?? undefined),
    // Only auto-load the schema when genuinely resuming (page at initial
    // "loading" state). NEVER auto-fetch during a round transition — that
    // auto-started the next round and derailed round progression.
    enabled: needsInitSchema && status === "loading",
  });

  const completeMutation = useMutation({
    mutationFn: () => completeInterview(token, tabSwitchCountRef.current),
    onSuccess: (body) => {
      logInterview.success("api", "complete_mutation_ok", {
        token: truncateId(token),
        hasMoreRounds: body.hasMoreRounds,
        nextRoundName: body.nextRoundName,
      });
      if (body.hasMoreRounds && body.nextRound) {
        setRoundTransition(
          planRoundTransition(body.nextRound, body.totalRounds ?? 1),
        );
        setData(null);
        setCurrentStep(FIRST_FORM_QUESTION_INDEX);
        setAnswers({});
        setSubmitAttempted(false);
        setStatus("round_complete");
      } else {
        setStatus("completed");
      }
    },
    onError: (err) => {
      logInterview.error("api", "complete_mutation_failed", {
        token: truncateId(token),
        error: err instanceof Error ? err.message : String(err),
      });
      setSubmitAttempted(true);
    },
  });

  useEffect(() => {
    // The component instance is reused when the token param changes (same tab,
    // different link). Reset ALL page state so a previous interview's form
    // position (currentStep/answers) can't leak into the next one.
    hasInitializedRef.current = false;
    wasPracticeSessionRef.current = false;
    setData(null);
    setAnswers({});
    setCurrentStep(FIRST_FORM_QUESTION_INDEX);
    setSubmitAttempted(false);
    setStatus("loading");
    setRoundTransition(null);
    setSessionMode(null);
    setWelcomeData(null);
    setError("");
    setVoiceWelcomeStep("welcome");
    setTabSwitchCount(0);
    tabSwitchCountRef.current = 0;
    logInterview.info("validate", "page_token_changed", {
      token: truncateId(token),
    });
  }, [token]);

  useEffect(() => {
    if (prevPageStatusRef.current !== status) {
      logInterview.info("state", "page_status_transition", {
        token: truncateId(token),
        from: prevPageStatusRef.current,
        to: status,
        sessionMode,
        bundleType: validation?.type,
        deliveryMode: validation?.deliveryMode,
      });
      prevPageStatusRef.current = status;
    }
  }, [status, sessionMode, token, validation?.type, validation?.deliveryMode]);

  useEffect(() => {
    if (isValidating) {
      logInterview.info("validate", "validation_loading", {
        token: truncateId(token),
      });
    }
  }, [isValidating, token]);

  useEffect(() => {
    if (validation) {
      logInterview.success("validate", "validation_ok", {
        token: truncateId(token),
        type: validation.type,
        status: validation.status,
        deliveryMode: validation.deliveryMode,
        currentRoundIndex:
          validation.type === "bundle"
            ? validation.currentRoundIndex
            : undefined,
      });
    }
  }, [validation, token]);

  useEffect(() => {
    if (isValidationError) {
      logInterview.error("validate", "validation_failed", {
        token: truncateId(token),
        error:
          validationError instanceof Error
            ? validationError.message
            : String(validationError),
      });
    }
  }, [isValidationError, validationError, token]);

  useEffect(() => {
    if (voiceInterview.state.isPractice) {
      wasPracticeSessionRef.current = true;
    }
  }, [voiceInterview.state.isPractice]);

  useEffect(() => {
    if (
      voiceInterview.state.status === "completed" &&
      !voiceInterview.state.isPractice
    ) {
      void refetchValidation().then((result) => {
        const freshValidation = result.data;
        if (
          freshValidation?.type === "bundle" &&
          freshValidation.status !== "completed"
        ) {
          // The next round is the ACTIVE round (currentRoundIndex), picked by
          // position — never "first pending", which skips a round if the next
          // round was already started.
          const nextRound =
            freshValidation.rounds?.[freshValidation.currentRoundIndex];
          if (nextRound) {
            setRoundTransition(
              planNextRoundFromValidation(
                nextRound,
                freshValidation.totalRounds,
                freshValidation.currentRoundIndex,
              ),
            );
            setStatus("round_complete");
            return;
          }
        }
        setStatus("completed");
      });
    }
  }, [
    voiceInterview.state.status,
    voiceInterview.state.isPractice,
    refetchValidation,
  ]);

  useEffect(() => {
    if (
      voiceInterview.state.status === "idle" &&
      status === "voice" &&
      wasPracticeSessionRef.current
    ) {
      wasPracticeSessionRef.current = false;
      setVoiceWelcomeStep("landing");
      setStatus("welcome");
    }
  }, [voiceInterview.state.status, status]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!validation || hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;

    logInterview.info("state", "init_from_validation", {
      token: truncateId(token),
      validationStatus: validation.status,
      type: validation.type,
      mode: resolveSessionMode(validation, token),
    });

    const isBundle = validation.type === "bundle";
    // SAFETY: the stored value is a SessionMode serialized by the voice
    // interview flow under this token's key; null when never persisted.
    const storedMode = sessionStorage.getItem(
      getModeStorageKey(token),
    ) as SessionMode | null;
    const welcome = buildWelcomeFromValidation(validation);
    const mode = resolveSessionMode(validation, token);

    if (validation.status === "in_progress") {
      if (mode === "voice") {
        setWelcomeData(welcome);
        setSessionMode("voice");
        if (
          voiceInterview.state.status === "active" ||
          voiceInterview.state.status === "connecting"
        ) {
          setStatus("voice");
        } else {
          setStatus("welcome");
        }
        return;
      }

      setWelcomeData(welcome);
      setSessionMode("form");
      return;
    }

    if (validation.status === "completed") {
      setStatus("completed");
      return;
    }

    setWelcomeData(welcome);

    if (isBundle) {
      sessionStorage.setItem(getModeStorageKey(token), mode);
      setSessionMode(mode);
      setStatus("welcome");
    } else if (storedMode === "voice") {
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
  }, [validation, token, voiceInterview.state.status]);

  useEffect(() => {
    if (!needsInitSchema || !schemaData || status !== "loading") {
      return;
    }

    setData(schemaData);
    setCurrentStep(FIRST_FORM_QUESTION_INDEX);
    logInterview.info("form", "schema_loaded_resume", {
      token: truncateId(token),
      questionCount: schemaData.questions.length,
    });
    setStatus("in_progress");
  }, [needsInitSchema, schemaData, status]);

  useEffect(() => {
    if (isValidationError && status === "loading") {
      setStatus("invalid");
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Invalid interview link",
      );
    }
  }, [isValidationError, validationError, status]);

  useEffect(() => {
    if (isSchemaError && status === "loading") {
      setStatus("invalid");
      setError(
        schemaError instanceof Error
          ? schemaError.message
          : "Failed to load interview",
      );
    }
  }, [isSchemaError, schemaError, status]);

  const handleStartInterview = useCallback(async () => {
    logInterview.info("form", "start_interview_clicked", {
      token: truncateId(token),
    });
    setStarting(true);
    try {
      const interviewData = await queryClient.fetchQuery(
        interviewSchemaOptions(token, validation?.sessionId ?? undefined),
      );
      setData(interviewData);
      setCurrentStep(FIRST_FORM_QUESTION_INDEX);
      setAnswers({});
      setSubmitAttempted(false);
      logInterview.success("form", "start_interview_ok", {
        token: truncateId(token),
        questionCount: interviewData.questions.length,
      });
      setStatus("in_progress");
    } catch (err) {
      logInterview.error("form", "start_interview_failed", {
        token: truncateId(token),
        error: err instanceof Error ? err.message : String(err),
      });
      setStatus("invalid");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start interview. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  }, [queryClient, token, validation?.sessionId]);

  const saveAnswer = useCallback(
    async (question: Question, answer: AnswerValue) => {
      if (!hasFormAnswer(answer)) {
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
        logInterview.info("form", "answer_saved", {
          token: truncateId(token),
          questionId: truncateId(question.id),
          inputMethod: answer.type === "mcq" ? "mcq" : "typed",
        });
      } catch (saveErr) {
        logInterview.warn("form", "answer_save_failed", {
          token: truncateId(token),
          questionId: truncateId(question.id),
          error: saveErr instanceof Error ? saveErr.message : String(saveErr),
        });
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
    if (!question) return;
    const answer = answers[question.id];
    if (answer && hasFormAnswer(answer)) {
      await saveAnswer(question, answer);
    }
    if (currentStep < data.questions.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [data, currentStep, answers, saveAnswer]);

  const handlePrev = useCallback(async () => {
    if (!data) return;

    const question = data.questions[currentStep];
    if (!question) return;
    const answer = answers[question.id];
    if (answer && hasFormAnswer(answer)) {
      await saveAnswer(question, answer);
    }
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [data, currentStep, answers, saveAnswer]);

  const handleComplete = useCallback(async () => {
    if (!data) return;
    logInterview.info("api", "complete_clicked", {
      token: truncateId(token),
      currentStep,
      questionCount: data.questions.length,
    });
    const unanswered = unansweredFormQuestionIndexes(data.questions, answers);
    if (unanswered.length > 0) {
      setSubmitAttempted(true);
      setCurrentStep(unanswered[0] ?? FIRST_FORM_QUESTION_INDEX);
      return;
    }
    for (const q of data.questions) {
      const filled = answers[q.id];
      if (filled && hasFormAnswer(filled)) {
        await saveAnswer(q, filled);
      }
    }
    completeMutation.mutate();
  }, [data, currentStep, answers, saveAnswer, completeMutation, token]);

  const handleContinueToNextRound = useCallback(async () => {
    logInterview.info("bundle", "continue_next_round", {
      token: truncateId(token),
    });
    const transition = roundTransition;
    if (!transition) {
      logInterview.error("bundle", "continue_next_round_missing_transition", {
        token: truncateId(token),
      });
      setStatus("invalid");
      setError("Invalid interview link");
      return;
    }

    setStarting(true);
    try {
      const mode = transition.sessionMode;
      const sessionId = transition.sessionId;
      sessionStorage.removeItem(getModeStorageKey(token));
      sessionStorage.setItem(getModeStorageKey(token), mode);

      // The mode decision comes from the authoritative transition (the server's
      // complete response), never from a re-fetched validation. The validation
      // refetch below is display-only (welcome data) and can never flip the mode.
      const freshValidation = await queryClient.fetchQuery(
        interviewTokenValidateOptions(token),
      );
      if (freshValidation) {
        setWelcomeData(buildWelcomeFromValidation(freshValidation));
      }

      setSessionMode(mode);
      setRoundTransition(null);

      if (mode === "voice") {
        setStatus("voice");
        await voiceInterview.start({ practice: false });
      } else {
        const interviewData = await queryClient.fetchQuery(
          interviewSchemaOptions(token, sessionId ?? undefined),
        );
        setData(interviewData);
        setCurrentStep(FIRST_FORM_QUESTION_INDEX);
        setAnswers({});
        setSubmitAttempted(false);
        setStatus("in_progress");
      }

      logInterview.success("bundle", "next_round_ready", {
        token: truncateId(token),
        mode,
        sessionId: truncateId(sessionId ?? undefined),
        currentRoundIndex:
          freshValidation?.type === "bundle"
            ? freshValidation.currentRoundIndex
            : undefined,
      });
    } catch (continueErr) {
      logInterview.error("bundle", "continue_next_round_failed", {
        token: truncateId(token),
        error:
          continueErr instanceof Error
            ? continueErr.message
            : String(continueErr),
      });
      setStatus("invalid");
      setError("Invalid interview link");
    } finally {
      setStarting(false);
    }
  }, [queryClient, token, voiceInterview, roundTransition]);

  const handleSelectForm = useCallback(() => {
    logInterview.info("state", "mode_selected", { mode: "form" });
    sessionStorage.setItem(getModeStorageKey(token), "form");
    setSessionMode("form");
    setStatus("welcome");
  }, [token]);

  const handleSelectVoice = useCallback(() => {
    logInterview.info("state", "mode_selected", { mode: "voice" });
    sessionStorage.setItem(getModeStorageKey(token), "voice");
    setSessionMode("voice");
    setStatus("welcome");
  }, [token]);

  const handleStartVoiceInterview = useCallback(async () => {
    logInterview.info("voice", "start_voice_clicked", {
      token: truncateId(token),
      practice: false,
    });
    setStarting(true);
    sessionStorage.setItem(getModeStorageKey(token), "voice");
    setSessionMode("voice");
    setStatus("voice");
    try {
      await voiceInterview.start({ practice: false });
    } finally {
      setStarting(false);
    }
  }, [token, voiceInterview]);

  const handleStartPracticeInterview = useCallback(async () => {
    logInterview.info("voice", "start_practice_clicked", {
      token: truncateId(token),
    });
    setPracticeStarting(true);
    sessionStorage.setItem(getModeStorageKey(token), "voice");
    setSessionMode("voice");
    setStatus("voice");
    try {
      await voiceInterview.start({ practice: true });
    } finally {
      setPracticeStarting(false);
    }
  }, [token, voiceInterview]);

  const handleTabSwitch = useCallback(() => {
    tabSwitchCountRef.current += 1;
    setTabSwitchCount(tabSwitchCountRef.current);
    setTabSwitchWarningVisible(true);
  }, []);

  useTabSwitchDetection(
    status === "in_progress" ||
      (status === "voice" && voiceInterview.state.status === "active"),
    handleTabSwitch,
  );

  useEffect(() => {
    if (status !== "in_progress") {
      return;
    }

    const onCopy = (event: ClipboardEvent) => event.preventDefault();
    const onPaste = (event: ClipboardEvent) => event.preventDefault();
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [status]);

  const currentFormQuestion = data?.questions[currentStep];
  const currentQuestionLimit =
    currentFormQuestion?.timeLimitSeconds ??
    (currentFormQuestion?.questionType === "mcq" ? 60 : 180);

  useEffect(() => {
    if (status !== "in_progress" || !data) {
      return;
    }
    setCountdown(currentQuestionLimit);
  }, [status, data, currentStep, currentQuestionLimit]);

  useEffect(() => {
    if (status !== "in_progress" || countdown <= 0) {
      return;
    }
    const id = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [status, countdown]);

  useEffect(() => {
    if (status !== "in_progress") {
      setTotalElapsed(0);
      return;
    }
    const startedAt = Date.now();
    setTotalElapsed(0);
    const id = window.setInterval(() => {
      setTotalElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  if (
    status === "loading" &&
    (isValidating || (needsInitSchema && isSchemaLoading))
  ) {
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

  if (status === "round_complete") {
    if (!roundTransition) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Preparing next round...
            </p>
          </div>
        </div>
      );
    }

    const transitionInstructions =
      roundTransition.sessionMode === "voice"
        ? [...VOICE_INSTRUCTIONS]
        : [...INSTRUCTIONS];

    return (
      <RoundTransitionSlide
        completedPart={roundTransition.completedPart}
        nextPart={roundTransition.nextPart}
        nextRoundName={roundTransition.nextRoundName}
        totalParts={roundTransition.totalParts}
        instructions={transitionInstructions}
        onContinue={handleContinueToNextRound}
        starting={starting}
      />
    );
  }

  if (status === "completed") {
    return <CompletionScreen candidateEmail={welcomeData?.candidateEmail} />;
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

  if (
    status === "voice" &&
    welcomeData &&
    voiceInterview.state.status !== "idle"
  ) {
    return (
      <>
        {tabSwitchWarningVisible ? (
          <TabSwitchWarning
            count={tabSwitchCount}
            onDismiss={() => setTabSwitchWarningVisible(false)}
          />
        ) : null}
        <VoiceInterview
          candidateName={welcomeData.candidateName}
          positionName={welcomeData.positionName}
          roundName={welcomeData.roundName}
          state={voiceInterview.state}
          videoStreamRef={voiceInterview.videoStreamRef}
          onStart={() =>
            voiceInterview.start({ practice: voiceInterview.state.isPractice })
          }
          onEnd={voiceInterview.endInterview}
        />
      </>
    );
  }

  if (status === "welcome" && welcomeData && sessionMode === "voice") {
    if (voiceWelcomeStep === "welcome") {
      return (
        <VoiceWelcomeSlide
          data={welcomeData}
          step="welcome"
          onContinue={() => setVoiceWelcomeStep("instructions")}
        />
      );
    }

    if (voiceWelcomeStep === "instructions") {
      return (
        <VoiceWelcomeSlide
          data={welcomeData}
          step="instructions"
          onContinue={() => setVoiceWelcomeStep("landing")}
          onBack={() => setVoiceWelcomeStep("welcome")}
        />
      );
    }

    return (
      <VoiceLandingScreen
        data={welcomeData}
        onStartInterview={handleStartVoiceInterview}
        onStartPractice={handleStartPracticeInterview}
        onViewInstructions={() => setVoiceWelcomeStep("instructions")}
        starting={starting}
        practiceStarting={practiceStarting}
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

  const question =
    data.questions[currentStep] ?? data.questions[FIRST_FORM_QUESTION_INDEX];
  if (!question) return null;
  const isLast = currentStep === data.questions.length - 1;
  const progress = ((currentStep + 1) / data.questions.length) * 100;
  const currentAnswer = answers[question.id];
  const isMcq = question.questionType === "mcq";
  const unansweredIndexes = unansweredFormQuestionIndexes(
    data.questions,
    answers,
  );
  const showUnansweredError = submitAttempted && unansweredIndexes.length > 0;
  const currentIsBlank = showUnansweredError && !hasFormAnswer(currentAnswer);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {tabSwitchWarningVisible ? (
        <TabSwitchWarning
          count={tabSwitchCount}
          onDismiss={() => setTabSwitchWarningVisible(false)}
        />
      ) : null}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-semibold">{data.roundName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {data.positionName} — {data.candidateName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                countdown <= 30
                  ? "border-red-300 text-red-600"
                  : "border-border",
              )}
            >
              <Timer className="size-3.5" />
              {formatCountdown(countdown)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {currentStep + 1} / {data.questions.length}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              {formatCountdown(totalElapsed)}
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
        {showUnansweredError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle />
            <AlertTitle>Answer every question before submitting</AlertTitle>
            <AlertDescription>
              {formatUnansweredQuestionLabel(unansweredIndexes)}{" "}
              {unansweredIndexes.length === 1 ? "is" : "are"} still blank.
              Please fill {unansweredIndexes.length === 1 ? "it" : "them"} in
              to finish this round.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-6 select-none">
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
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-4 select-none",
                    currentIsBlank && "border-destructive",
                  )}
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer select-none"
                  >
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
              aria-invalid={currentIsBlank}
              className={cn(
                "min-h-[200px] resize-y text-base leading-relaxed",
                currentIsBlank && "border-destructive focus-visible:ring-destructive",
              )}
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
                disabled={completeMutation.isPending || saving}
                size="sm"
              >
                {completeMutation.isPending ? (
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
          {data.questions.map((q, i) => {
            const answered = hasFormAnswer(answers[q.id]);
            const isCurrent = i === currentStep;
            const highlightBlank = showUnansweredError && !answered;
            return (
              <button
                key={q.id}
                type="button"
                onClick={async () => {
                  const currentQ = data.questions[currentStep];
                  if (currentQ) {
                    const currentA = answersRef.current[currentQ.id];
                    if (currentA && hasFormAnswer(currentA)) {
                      await saveAnswer(currentQ, currentA);
                    }
                  }
                  setCurrentStep(i);
                }}
                className={cn(
                  "flex size-7 items-center justify-center rounded text-xs font-medium transition-colors",
                  isCurrent && highlightBlank && "bg-destructive text-white",
                  isCurrent && !highlightBlank && "bg-primary text-primary-foreground",
                  !isCurrent && answered && "bg-primary/20 text-primary",
                  !isCurrent &&
                    highlightBlank &&
                    "bg-destructive/15 text-destructive ring-1 ring-destructive",
                  !isCurrent &&
                    !answered &&
                    !showUnansweredError &&
                    "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
