import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, Mic, PhoneOff } from "lucide-react";
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
  const isActive = state.status === "active" || state.status === "connecting";

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Interview
        </CardTitle>
        <CardDescription>
          {candidateName} · {positionName} · {roundName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {state.status}
          </Badge>
          {state.status === "active" ? (
            <span className="text-sm text-muted-foreground">
              Question {state.currentQuestionIndex + 1}
            </span>
          ) : null}
        </div>

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        {state.transcripts.length > 0 ? (
          <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-2">
            {state.transcripts.map((entry, index) => (
              <p key={`${entry.role}-${index}`} className="text-sm">
                <span className="font-medium capitalize">{entry.role}:</span>{" "}
                {entry.text}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Stay in fullscreen and answer each question when prompted. Your
            microphone will be used for the full session recording.
          </p>
        )}

        <div className="flex gap-2">
          {state.status === "idle" || state.status === "error" ? (
            <Button onClick={onStart}>
              <Mic className="h-4 w-4 mr-2" />
              Start Voice Interview
            </Button>
          ) : null}

          {state.status === "connecting" ? (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </Button>
          ) : null}

          {isActive ? (
            <Button variant="destructive" onClick={onEnd}>
              <PhoneOff className="h-4 w-4 mr-2" />
              End Interview
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
