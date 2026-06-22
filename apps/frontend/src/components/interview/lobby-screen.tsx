import { Button } from "~/components/ui/button";
import { Mic, Play, BookOpen, ArrowRight } from "lucide-react";

interface LobbyScreenProps {
  positionName: string;
  onPractice: () => void;
  onStartInterview: () => void;
  onViewInstructions: () => void;
}

export default function LobbyScreen({
  positionName,
  onPractice,
  onStartInterview,
  onViewInstructions,
}: LobbyScreenProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Dark Alpha Capital
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{positionName}</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re ready to begin. Use the practice session to get comfortable
            with the platform before your real interview.
          </p>
        </div>

        {/* Action buttons */}
        <div className="rounded-2xl border bg-card px-6 py-6 space-y-3">
          <Button
            size="lg"
            className="w-full"
            onClick={onPractice}
          >
            <Mic className="mr-2 size-4" />
            Practice Session
          </Button>

          <Button
            size="lg"
            variant="destructive"
            className="w-full"
            onClick={onStartInterview}
          >
            <Play className="mr-2 size-4" />
            Start Interview
            <ArrowRight className="ml-2 size-4" />
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={onViewInstructions}
          >
            <BookOpen className="mr-2 size-4" />
            View Instructions
          </Button>
        </div>
      </div>
    </div>
  );
}
