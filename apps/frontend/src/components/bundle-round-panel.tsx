import {
  buildNamedEntityFolderPath,
  formatPersonName,
} from "@workspace/nextcloud/paths";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  MessageSquare,
  Mic,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { InterviewSessionRecording } from "~/components/interview-session-recording";
import { getOptionLabel } from "~/lib/question-options";
import type { QuestionOption } from "@workspace/db/question-types";
import type { CheatingSummary } from "@workspace/db/enums";
import type {
  InterviewBundleDetailData,
  InterviewResponse,
} from "~/lib/loaders/interviews";
import { cn, formatDate } from "~/lib/utils";

type BundleRoundDetail = InterviewBundleDetailData["roundDetails"][number];

interface BundleRoundPanelProps {
  roundDetail: BundleRoundDetail;
  candidate: InterviewBundleDetailData["candidate"];
  index?: number;
  totalRounds?: number;
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function RoundStatusBadges({
  roundDetail,
}: {
  roundDetail: BundleRoundDetail;
}) {
  const { round } = roundDetail;
  const DeliveryIcon =
    round.bundleRound.deliveryMode === "voice" ? Mic : ClipboardList;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="capitalize">
        <DeliveryIcon className="h-3 w-3 mr-1" />
        {round.bundleRound.deliveryMode}
      </Badge>
      <Badge
        variant="secondary"
        className={cn(
          round.bundleRound.status === "in_progress" &&
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0",
          round.bundleRound.status === "completed" &&
            "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0",
        )}
      >
        {statusLabel(round.bundleRound.status)}
      </Badge>
      <Badge variant="secondary">{statusLabel(round.session.status)}</Badge>
    </div>
  );
}

function ResponsesSection({ responses }: { responses: InterviewResponse[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Responses ({responses.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No responses recorded yet.
          </p>
        ) : (
          responses.map((response, index) => (
            <div
              key={response.id}
              className="border-b pb-4 last:border-0 last:pb-0 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide text-primary">
                  Q{index + 1}
                </span>
                {response.question?.category ? (
                  <span className="text-muted-foreground/70">
                    · {response.question.category}
                  </span>
                ) : null}
                {response.inputMethod ? (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px] capitalize"
                  >
                    {response.inputMethod === "voice" ? (
                      <Mic className="h-2.5 w-2.5 mr-0.5" />
                    ) : null}
                    {response.inputMethod}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm font-medium leading-snug">
                {response.question?.questionText ?? "Question"}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {formatResponseAnswer(response)}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EvaluationSection({
  evaluation,
}: {
  evaluation: NonNullable<BundleRoundDetail["evaluation"]>;
}) {
  const strengths = asStringList(evaluation.strengths);
  const risks = asStringList(evaluation.risks);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Session Evaluation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {evaluation.summary ? (
          <p className="text-sm leading-relaxed">{evaluation.summary}</p>
        ) : null}

        {evaluation.score != null || evaluation.recommendation ? (
          <div className="flex flex-wrap items-center gap-3">
            {evaluation.score != null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight">
                  {evaluation.score}
                </span>
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
            ) : null}
            {evaluation.recommendation ? (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0"
              >
                {evaluation.recommendation}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {strengths.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Strengths
            </p>
            <ul className="space-y-1 text-sm">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {risks.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Risks
            </p>
            <ul className="space-y-1 text-sm">
              {risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AntiCheatSummary({ summary }: { summary: CheatingSummary }) {
  const candidates: Array<[string, number | undefined]> = [
    ["Tab switches", summary.tabSwitches],
    ["Focus lost (sec)", summary.focusLostSeconds],
    ["Fullscreen exits", summary.fullscreenExits],
    ["Copy attempts", summary.copyAttempts],
    ["Paste attempts", summary.pasteAttempts],
  ];
  const rows = candidates.filter(
    (row): row is [string, number] => row[1] != null,
  );

  return (
    <Collapsible className="group">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Anti-cheat Summary
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-b-lg border border-t-0 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          {rows.length > 0 ? (
            <dl className="space-y-1">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4"
                >
                  <dt>{label}</dt>
                  <dd className="font-medium text-foreground">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>No anti-cheat events recorded.</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function BundleRoundPanel({
  roundDetail,
  candidate,
  index = 0,
  totalRounds,
}: BundleRoundPanelProps) {
  const { round, responses, evaluation } = roundDetail;
  const session = round.session;
  const hasRecording = Boolean(
    session.sessionAudioUrl || session.sessionAudioPath,
  );
  const isEmpty = responses.length === 0 && !evaluation && !hasRecording;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Round {index + 1}
            {totalRounds != null ? ` of ${totalRounds}` : ""}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {round.round.name}
          </h2>
          {round.round.description ? (
            <p className="text-sm text-muted-foreground">
              {round.round.description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            {session.startedAt ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Started {formatDate(session.startedAt)}
              </span>
            ) : null}
            {session.completedAt ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Completed {formatDate(session.completedAt)}
              </span>
            ) : null}
            {session.interruptedAt ? (
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-500" />
                Interrupted {formatDate(session.interruptedAt)}
              </span>
            ) : null}
          </div>
        </div>
        <RoundStatusBadges roundDetail={roundDetail} />
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium">Round not started yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Responses, evaluation and recording will appear here once the
            candidate completes this round.
          </p>
        </div>
      ) : (
        <>
          <ResponsesSection responses={responses} />

          {evaluation ? <EvaluationSection evaluation={evaluation} /> : null}

          {session.cheatingSummary ? (
            <AntiCheatSummary summary={session.cheatingSummary} />
          ) : null}

          {hasRecording ? (
            <section className="space-y-2">
              <InterviewSessionRecording sessionId={session.id} />
              <p className="text-xs text-muted-foreground">
                Stored at:{" "}
                {session.sessionAudioPath ??
                  `${buildNamedEntityFolderPath({
                    root: "/ATS/interviews",
                    name: candidate
                      ? formatPersonName(
                          candidate.firstName,
                          candidate.lastName,
                        )
                      : null,
                    id: session.id,
                  })}/screen-recording.webm`}
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
