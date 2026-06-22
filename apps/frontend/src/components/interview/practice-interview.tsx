import { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  PartyPopper,
  X,
} from "lucide-react";
import VoiceRecorder from "~/components/interview/voice-recorder";

interface PracticeQuestion {
  id: string;
  text: string;
}

const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: "p1",
    text: "Tell me about yourself and your professional background.",
  },
  {
    id: "p2",
    text: "Describe a challenging situation you faced at work and how you resolved it.",
  },
  {
    id: "p3",
    text: "Why are you interested in this role at DAC?",
  },
  {
    id: "p4",
    text: "What are your greatest professional strengths? How do you think you can apply them here?",
  },
  {
    id: "p5",
    text: "Where do you see yourself in five years?",
  },
];

interface PracticeInterviewProps {
  token: string;
  onFinish: () => void;
}

export default function PracticeInterview({
  token,
  onFinish,
}: PracticeInterviewProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Tracks which questions have a locked voice answer (textarea becomes read-only)
  const [voiceUsed, setVoiceUsed] = useState<Record<string, boolean>>({});
  const [isDone, setIsDone] = useState(false);

  const question = PRACTICE_QUESTIONS[step];
  if (!question) return null;
  const isLast = step === PRACTICE_QUESTIONS.length - 1;
  const progress = ((step + 1) / PRACTICE_QUESTIONS.length) * 100;
  const isVoiceLocked = !!voiceUsed[question.id];

  const handleVoiceTranscript = useCallback((qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
    setVoiceUsed((prev) => ({ ...prev, [qId]: true }));
  }, []);

  const handleTypeInstead = useCallback((qId: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: "" }));
    setVoiceUsed((prev) => ({ ...prev, [qId]: false }));
  }, []);

  if (isDone) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card px-8 py-10 text-center space-y-5">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <PartyPopper className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Practice Complete!</h2>
            <p className="text-sm text-muted-foreground">
              Great job! You&apos;re now familiar with the interview format and
              the voice dictation feature. Head back to the lobby when you&apos;re
              ready to start your real interview.
            </p>
          </div>
          <Button className="w-full" onClick={onFinish}>
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-semibold">Practice Session</h1>
            <p className="truncate text-xs text-muted-foreground">
              Not recorded — familiarize yourself with the platform
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-muted-foreground">
              {step + 1} / {PRACTICE_QUESTIONS.length}
            </span>
            {/* Exit practice early — no confirmation needed since nothing is saved */}
            <Button
              variant="secondary"
              size="sm"
              onClick={onFinish}
              className="h-7 gap-1 text-xs"
            >
              <X className="size-3.5" />
              Exit Practice
            </Button>
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div className="mb-6">
          <Badge variant="secondary" className="mb-2">
            Practice
          </Badge>
          <h2 className="text-lg font-medium leading-relaxed">{question.text}</h2>
        </div>

        <div className="flex-1 space-y-3">
          <Textarea
            value={answers[question.id] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
            }
            placeholder="Type your answer here…"
            className="min-h-[200px] resize-y text-base leading-relaxed"
            disabled={isVoiceLocked}
          />
          {/* VoiceRecorder is keyed by question id so it fully resets on navigation */}
          <VoiceRecorder
            key={question.id}
            token={token}
            disabled={isVoiceLocked}
            onTranscript={(text) => handleVoiceTranscript(question.id, text)}
            onTypeInstead={() => handleTypeInstead(question.id)}
          />
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Previous
          </Button>

          {isLast ? (
            <Button size="sm" onClick={() => setIsDone(true)}>
              <CheckCircle2 className="mr-1.5 size-4" />
              Finish Practice
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          )}
        </div>

        {/* Question dot navigation */}
        <div className="mt-4 flex flex-wrap gap-1">
          {PRACTICE_QUESTIONS.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setStep(i)}
              className={`flex size-7 items-center justify-center rounded text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]?.trim()
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