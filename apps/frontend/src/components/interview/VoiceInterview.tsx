import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Clock, Loader2, Mic, PhoneOff } from "lucide-react";
import type { VoiceInterviewState } from "~/hooks/useVoiceInterview";

interface VoiceInterviewProps {
  candidateName: string;
  positionName: string;
  roundName: string;
  state: VoiceInterviewState;
  onStart: () => void;
  onEnd: () => void;
}

export default function VoiceInterview({
  candidateName,
  positionName,
  roundName,
  state,
  onStart,
  onEnd,
}: VoiceInterviewProps) {
  const isActive =
    state.status === "active" ||
    state.status === "connecting" ||
    state.isEnding;
  const questionCount = state.questions.length;
  const currentQuestion =
    state.displayQuestion ?? state.questions[state.currentQuestionIndex];
  const progress =
    questionCount > 0 && !state.introActive
      ? ((state.currentQuestionIndex + 1) / questionCount) * 100
      : 0;
  const isMcq =
    currentQuestion?.questionType === "mcq" && Boolean(currentQuestion.options?.length);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-semibold">{roundName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {positionName} — {candidateName}
            </p>
          </div>
          {questionCount > 0 && !state.introActive ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <Clock className="size-3.5" />
              <span>
                {state.currentQuestionIndex + 1} / {questionCount}
              </span>
            </div>
          ) : (
            <Badge variant={isActive ? "default" : "secondary"} className="shrink-0 capitalize">
              {state.introActive ? "intro" : state.status}
            </Badge>
          )}
        </div>
        {questionCount > 0 && !state.introActive ? (
          <div className="h-1 w-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        {state.allQuestionsAsked ? (
          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <AlertDescription>
              All questions have been asked. When you are ready, click{" "}
              <strong>End Interview</strong> below to complete your session.
            </AlertDescription>
          </Alert>
        ) : null}

        {state.introActive ? (
          <div className="mb-6 rounded-lg border bg-muted/30 p-6 text-center">
            <Mic className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h2 className="text-lg font-medium">Welcome</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The interviewer is introducing the session. Listen and let them know when
              you are ready to begin.
            </p>
          </div>
        ) : currentQuestion ? (
          <div className="mb-6">
            <Badge variant="secondary" className="mb-2">
              {currentQuestion.category || "General"}
            </Badge>
            <h2 className="text-lg font-medium leading-relaxed">
              {currentQuestion.questionText}
            </h2>
            {currentQuestion.timeLimitSeconds ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Suggested time: {Math.ceil(currentQuestion.timeLimitSeconds / 60)} min
              </p>
            ) : null}
            {isMcq ? (
              <ul className="mt-4 space-y-2">
                {currentQuestion.options!.map((option, index) => (
                  <li
                    key={option.id}
                    className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {String.fromCharCode(65 + index)}.
                    </span>{" "}
                    {option.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : state.status === "connecting" ? (
          <p className="mb-6 text-sm text-muted-foreground">
            Connecting to the voice interviewer...
          </p>
        ) : null}

        <Card className="mt-auto">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="h-4 w-4" />
              Live Conversation
            </CardTitle>
            <CardDescription>
              Speak clearly when prompted. Your session is being recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.liveUserTranscript ? (
              <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  You (speaking…)
                </p>
                <p className="text-sm">{state.liveUserTranscript}</p>
              </div>
            ) : null}

            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}

            {state.transcripts.length > 0 ? (
              <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-3">
                {state.transcripts.map((entry, index) => (
                  <div key={`${entry.role}-${index}`} className="text-sm">
                    <p className="text-xs font-medium capitalize text-muted-foreground mb-0.5">
                      {entry.role === "assistant" ? "Interviewer" : "You"}
                    </p>
                    <p>{entry.text}</p>
                  </div>
                ))}
              </div>
            ) : !state.liveUserTranscript && state.status === "active" ? (
              <p className="text-sm text-muted-foreground">
                Transcripts will appear here as you speak and as the interviewer asks
                questions.
              </p>
            ) : null}

            <div className="flex gap-2 pt-2">
              {state.status === "idle" || state.status === "error" ? (
                <Button onClick={onStart}>
                  <Mic className="h-4 w-4 mr-2" />
                  Retry Voice Interview
                </Button>
              ) : null}

              {state.status === "connecting" ? (
                <Button disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </Button>
              ) : null}

              {isActive ? (
                <Button
                  variant="destructive"
                  onClick={onEnd}
                  disabled={state.isEnding}
                  className={
                    state.allQuestionsAsked && !state.isEnding
                      ? "animate-pulse"
                      : undefined
                  }
                >
                  {state.isEnding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Ending interview...
                    </>
                  ) : (
                    <>
                      <PhoneOff className="h-4 w-4 mr-2" />
                      End Interview
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
