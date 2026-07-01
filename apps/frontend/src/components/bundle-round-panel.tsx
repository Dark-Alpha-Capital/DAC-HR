import {
  buildNamedEntityFolderPath,
  formatPersonName,
} from "@workspace/nextcloud/paths";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ClipboardList, MessageSquare, Mic, Monitor } from "lucide-react";
import { InterviewSessionRecording } from "~/components/interview-session-recording";
import { getOptionLabel } from "~/lib/question-options";
import type { QuestionOption } from "@workspace/db/question-types";
import type { InterviewBundleDetailData, InterviewResponse } from "~/lib/loaders/interviews";

type BundleRoundDetail = InterviewBundleDetailData["roundDetails"][number];

interface BundleRoundPanelProps {
  roundDetail: BundleRoundDetail;
  candidate: InterviewBundleDetailData["candidate"];
}

function formatResponseAnswer(response: InterviewResponse): string {
  if (response.transcript?.trim()) return response.transcript;
  if (response.question?.questionType === "mcq") {
    return (
      getOptionLabel(
        response.question.options as QuestionOption[],
        response.selectedOptionId,
      ) ??
      response.selectedOptionId ??
      "No answer"
    );
  }
  return response.answerText || "No answer";
}

export function BundleRoundPanel({
  roundDetail,
  candidate,
}: BundleRoundPanelProps) {
  const { round, responses, evaluation } = roundDetail;
  const session = round.session;
  const hasRecording = Boolean(
    session.sessionAudioUrl || session.sessionAudioPath,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {round.bundleRound.deliveryMode === "voice" ? (
            <Mic className="h-3 w-3 mr-1" />
          ) : (
            <ClipboardList className="h-3 w-3 mr-1" />
          )}
          {round.bundleRound.deliveryMode}
        </Badge>
        <Badge variant="secondary">{round.bundleRound.status}</Badge>
        <Badge variant="secondary">{session.status}</Badge>
      </div>

      <Tabs defaultValue="responses">
        <TabsList>
          <TabsTrigger value="responses" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Responses
            {responses.length > 0 ? ` (${responses.length})` : ""}
          </TabsTrigger>
          {hasRecording ? (
            <TabsTrigger value="recording" className="gap-2">
              <Monitor className="h-4 w-4" />
              Recording
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="responses" className="mt-4 space-y-4">
          {session.cheatingSummary ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Anti-cheat Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(session.cheatingSummary, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Responses ({responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No responses recorded yet.
                </p>
              ) : (
                responses.map((response) => (
                  <div
                    key={response.id}
                    className="border-b pb-4 last:border-0"
                  >
                    <p className="text-sm font-medium mb-1">
                      {response.question?.questionText}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatResponseAnswer(response)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {evaluation ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Session Evaluation</CardTitle>
              </CardHeader>
              <CardContent>
                {evaluation.summary ? (
                  <p className="text-sm">{evaluation.summary}</p>
                ) : null}
                {evaluation.score != null ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Score: {evaluation.score}/10
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {hasRecording ? (
          <TabsContent value="recording" className="mt-4">
            <InterviewSessionRecording sessionId={session.id} />
            <p className="text-xs text-muted-foreground mt-2">
              Stored at:{" "}
              {session.sessionAudioPath ??
                `${buildNamedEntityFolderPath({
                  root: "/ATS/interviews",
                  name: candidate
                    ? formatPersonName(candidate.firstName, candidate.lastName)
                    : null,
                  id: session.id,
                })}/screen-recording.webm`}
            </p>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
