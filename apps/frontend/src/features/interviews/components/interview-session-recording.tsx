import { Download, Monitor } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface InterviewSessionRecordingProps {
  sessionId: string;
}

export function InterviewSessionRecording({
  sessionId,
}: InterviewSessionRecordingProps) {
  const recordingSrc = `/api/interview-sessions/${sessionId}/recording`;
  const downloadHref = `${recordingSrc}?download=1`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Screen Recording
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <video
          controls
          preload="metadata"
          className="w-full rounded-md border bg-black max-h-[480px]"
          src={recordingSrc}
        >
          Your browser does not support video playback.
        </video>
        <Button asChild variant="outline" size="sm">
          <a href={downloadHref} download="screen-recording.webm">
            <Download className="h-4 w-4 mr-2" />
            Download Recording
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
