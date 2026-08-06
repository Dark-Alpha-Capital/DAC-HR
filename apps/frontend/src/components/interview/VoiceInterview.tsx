import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Bot, Loader2, Mic, PhoneOff, Timer } from "lucide-react";
import { cn } from "~/lib/utils";
import type { VoiceInterviewState } from "~/hooks/useVoiceInterview";
import { logInterview } from "~/lib/interview-debug-log";

interface VoiceInterviewProps {
  candidateName: string;
  positionName: string;
  roundName: string;
  state: VoiceInterviewState;
  videoStreamRef: RefObject<MediaStream | null>;
  onStart: () => void;
  onEnd: () => void;
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${m}:${String(secs).padStart(2, "0")}`;
}

function formatClockTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function VoiceInterview({
  candidateName,
  positionName,
  roundName,
  state,
  videoStreamRef,
  onStart,
  onEnd,
}: VoiceInterviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [clock, setClock] = useState(() => formatClockTime(new Date()));
  const [countdown, setCountdown] = useState(0);

  const isActive =
    state.status === "active" ||
    state.status === "connecting" ||
    state.isEnding;
  const questionCount = state.questions.length;
  const currentQuestion =
    state.questions[state.currentQuestionIndex] ??
    state.displayQuestion ??
    null;
  const activeQuestion =
    currentQuestion &&
    (state.voicePhase === "questions" ||
      state.voicePhase === "closing" ||
      state.voicePhase === "awaiting_end" ||
      state.displayQuestion)
      ? currentQuestion
      : null;
  const isMcq =
    activeQuestion?.questionType === "mcq" &&
    Boolean(activeQuestion.options?.length);

  const questionLimitSeconds =
    activeQuestion?.timeLimitSeconds ?? 180;

  useEffect(() => {
    setCountdown(questionLimitSeconds);
  }, [state.currentQuestionIndex, activeQuestion?.id, questionLimitSeconds]);

  useEffect(() => {
    if (state.status !== "active" || countdown <= 0 || !activeQuestion) {
      return;
    }
    const id = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [state.status, countdown, activeQuestion]);

  const progress =
    questionCount > 0
      ? Math.min(
          100,
          ((state.currentQuestionIndex + 1) / questionCount) * 100,
        )
      : 0;

  useEffect(() => {
    const video = videoRef.current;
    const stream = videoStreamRef.current;
    if (!video || !stream) {
      return;
    }
    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [state.status, videoStreamRef]);

  useEffect(() => {
    if (state.status !== "active") {
      return;
    }
    const startedAt = Date.now();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      setClock(formatClockTime(new Date()));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [state.transcripts, state.liveUserTranscript, state.liveAssistantTranscript]);

  if (state.status === "idle" || state.status === "error") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-[#202124] px-4 text-white">
        <Mic className="mb-4 size-10 text-[#8ab4f8]" />
        <h1 className="text-xl font-medium">
          {state.isPractice ? "Practice Session" : roundName}
        </h1>
        <p className="mt-1 text-sm text-[#9aa0a6]">
          {positionName} — {candidateName}
        </p>
        {state.replacedElsewhere ? (
          <div className="mt-6 max-w-md rounded-lg bg-[#3c4043] px-4 py-3 text-center text-sm text-[#e8eaed]">
            This interview was opened in another tab. Please use the other tab
            to continue.
          </div>
        ) : state.error ? (
          <p className="mt-4 max-w-md text-center text-sm text-red-400">
            {state.error}
          </p>
        ) : null}
        {state.status === "error" && !state.replacedElsewhere ? (
          <Button
            onClick={() => {
              logInterview.info("voice", "ui_retry_clicked");
              onStart();
            }}
            className="mt-6 bg-[#1a73e8] hover:bg-[#1765cc]"
          >
            <Mic className="mr-2 size-4" />
            {state.isPractice ? "Retry Practice" : "Retry Voice Interview"}
          </Button>
        ) : null}
      </div>
    );
  }

  const sessionTitle = state.isPractice
    ? `Practice — ${positionName}`
    : `${roundName} — ${positionName}`;

  return (
    <div className="flex h-svh flex-col bg-[#202124] text-white">
      {state.audioOnly ? (
        <div className="border-b border-white/10 bg-[#1a73e8]/20 px-4 py-2 text-center text-xs text-[#8ab4f8]">
          Voice only — screen recording isn&apos;t available on this device.
        </div>
      ) : null}
      {state.replacedElsewhere ? (
        <div className="border-b border-white/10 bg-[#3c4043] px-4 py-2 text-center text-xs text-[#e8eaed]">
          This interview was opened in another tab. Please use the other tab.
        </div>
      ) : null}
      {/* Sticky session progress bar */}
      <div className="shrink-0 border-b border-white/10 bg-[#292929] px-4 py-2 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 text-xs text-[#9aa0a6]">
            <span className="truncate">{sessionTitle}</span>
            {questionCount > 0 ? (
              <span className="shrink-0 text-[#e8eaed]">
                Q {state.currentQuestionIndex + 1} / {questionCount}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            {activeQuestion ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                  countdown <= 30
                    ? "bg-red-500/20 text-red-400"
                    : "bg-[#3c4043] text-[#e8eaed]",
                )}
              >
                <Timer className="size-3.5" />
                {formatCountdown(countdown)}
              </span>
            ) : null}
            <span className="text-[#9aa0a6]">{formatElapsed(elapsed)}</span>
          </div>
        </div>
        <div className="mt-2 h-0.5 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#8ab4f8] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {state.timeLimitReached ? (
          <p className="mt-2 text-xs text-amber-300">
            You&apos;ve reached the time limit. The interview will end shortly.
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Main video area */}
        <div className="relative flex min-h-[45vh] flex-1 flex-col lg:min-h-0">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-3 lg:p-4">
            <div className="relative h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-[#3c4043]">
              {state.status === "connecting" ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#202124]/80">
                  <Loader2 className="size-8 animate-spin text-[#8ab4f8]" />
                  <p className="text-sm text-[#9aa0a6]">
                    Connecting to your interviewer...
                  </p>
                </div>
              ) : null}

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="size-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />

              <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-sm font-medium backdrop-blur-sm">
                {candidateName}
              </div>

              {/* Interviewer PiP */}
              <div className="absolute bottom-3 right-3 flex w-36 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#3c4043] shadow-lg sm:w-44">
                <div className="flex aspect-video items-center justify-center bg-[#5f6368]">
                  <Bot className="size-8 text-[#8ab4f8]" />
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-[#e8eaed]">
                  Interviewer
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex h-[45vh] min-h-0 w-full flex-col border-t border-white/10 bg-[#292929] lg:h-auto lg:w-[380px] lg:border-t-0 lg:border-l">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-[#e8eaed]">
                Live Transcript
              </h2>
              {state.isPractice ? (
                <Badge className="bg-[#1a73e8]/30 text-[#8ab4f8] hover:bg-[#1a73e8]/30">
                  Practice
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Current question — driven by DO currentQuestionIndex */}
          <div className="border-b border-white/10 px-4 py-3">
            {activeQuestion ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="bg-[#5f6368] text-[#e8eaed] hover:bg-[#5f6368]">
                    {activeQuestion.category || "Question"}
                  </Badge>
                  {questionCount > 0 ? (
                    <span className="text-xs text-[#9aa0a6]">
                      {state.currentQuestionIndex + 1} / {questionCount}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium leading-relaxed text-[#e8eaed]">
                  {activeQuestion.questionText}
                </p>
                {isMcq ? (
                  <ul className="space-y-1 text-xs text-[#bdc1c6]">
                    {activeQuestion.options!.map((option, index) => (
                      <li key={option.id}>
                        {String.fromCharCode(65 + index)}. {option.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : state.introActive ? (
              <div className="space-y-1">
                <Badge className="bg-[#5f6368] text-[#e8eaed] hover:bg-[#5f6368]">
                  Welcome
                </Badge>
                <p className="text-sm leading-relaxed text-[#e8eaed]">
                  Listen to the introduction and say when you&apos;re ready to
                  begin.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#9aa0a6]">
                Waiting for the next question...
              </p>
            )}

            {state.allQuestionsAsked ? (
              <p className="mt-3 rounded-lg bg-[#1a73e8]/20 px-3 py-2 text-xs text-[#8ab4f8]">
                {state.isPractice ? (
                  <>
                    Practice complete. Click <strong>Exit Practice</strong> below
                    to return.
                  </>
                ) : (
                  <>
                    All questions complete. Click <strong>End Interview</strong>{" "}
                    below to finish.
                  </>
                )}
              </p>
            ) : null}
          </div>

          {/* Chat transcript */}
          <div
            ref={transcriptRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            {state.transcripts.length === 0 &&
            !state.liveUserTranscript &&
            !state.liveAssistantTranscript ? (
              <p className="text-center text-sm text-[#9aa0a6]">
                Conversation will appear here as you speak.
              </p>
            ) : null}

            {state.transcripts.map((entry, index) => (
              <TranscriptBubble
                key={`${entry.role}-${index}`}
                role={entry.role}
                text={entry.text}
                candidateName={candidateName}
              />
            ))}

            {state.liveAssistantTranscript ? (
              <TranscriptBubble
                role="assistant"
                text={state.liveAssistantTranscript}
                candidateName={candidateName}
                isLive
              />
            ) : null}

            {state.liveUserTranscript ? (
              <TranscriptBubble
                role="user"
                text={state.liveUserTranscript}
                candidateName={candidateName}
                isLive
              />
            ) : null}
          </div>
        </aside>
      </div>

      {/* Bottom control bar */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-[#202124] px-4 py-3 sm:px-6">
        <div className="min-w-0 truncate text-sm text-[#9aa0a6]">
          <span className="text-[#e8eaed]">{clock}</span>
          <span className="mx-2">|</span>
          <span className="truncate">{sessionTitle}</span>
          {state.status === "active" ? (
            <span className="ml-2 hidden text-xs sm:inline">
              ({formatElapsed(elapsed)})
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <Button
              variant="destructive"
              onClick={() => {
                logInterview.info("voice", "ui_end_clicked", {
                  allQuestionsAsked: state.allQuestionsAsked,
                  isPractice: state.isPractice,
                });
                onEnd();
              }}
              disabled={state.isEnding}
              className={cn(
                "rounded-full px-5",
                state.allQuestionsAsked && !state.isEnding && "animate-pulse",
              )}
            >
              {state.isEnding ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Ending...
                </>
              ) : (
                <>
                  <PhoneOff className="mr-2 size-4" />
                  {state.isPractice ? "Exit Practice" : "End Interview"}
                </>
              )}
            </Button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function TranscriptBubble({
  role,
  text,
  candidateName,
  isLive = false,
}: {
  role: "user" | "assistant";
  text: string;
  candidateName: string;
  isLive?: boolean;
}) {
  const isUser = role === "user";
  const label = isUser ? candidateName : "Interviewer";

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      <span className="px-1 text-xs font-medium text-[#9aa0a6]">{label}</span>
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-[#1a73e8] text-white"
            : "rounded-bl-md bg-[#3c4043] text-[#e8eaed]",
          isLive && "opacity-80",
        )}
      >
        {text}
        {isLive ? (
          <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-white/80" />
        ) : null}
      </div>
    </div>
  );
}
