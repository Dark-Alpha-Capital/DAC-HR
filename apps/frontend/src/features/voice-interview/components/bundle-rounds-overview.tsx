import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import type { DeliveryMode } from "@workspace/db/enums";
import { CheckCircle2, ClipboardList, Mic } from "lucide-react";
import { useEffect } from "react";
import { logInterview } from "#/features/voice-interview/interview-debug-log";

export interface BundleRoundSummary {
  roundName: string;
  deliveryMode: DeliveryMode;
  status: "pending" | "in_progress" | "completed";
  roundOrder: number;
}

interface BundleRoundsOverviewProps {
  rounds: BundleRoundSummary[];
  currentRoundIndex?: number;
}

function formatModeSummary(voiceCount: number, formCount: number) {
  const parts: string[] = [];
  if (voiceCount > 0) {
    parts.push(`${voiceCount} voice`);
  }
  if (formCount > 0) {
    parts.push(`${formCount} written`);
  }
  return parts.join(" · ");
}

export default function BundleRoundsOverview({
  rounds,
  currentRoundIndex,
}: BundleRoundsOverviewProps) {
  if (rounds.length === 0) {
    return null;
  }

  const voiceCount = rounds.filter((r) => r.deliveryMode === "voice").length;
  const formCount = rounds.filter((r) => r.deliveryMode === "form").length;
  const modeSummary = formatModeSummary(voiceCount, formCount);

  useEffect(() => {
    logInterview.info("bundle", "rounds_overview_mounted", {
      roundCount: rounds.length,
      currentRoundIndex,
      voiceCount,
      formCount,
    });
  }, [rounds.length, currentRoundIndex, voiceCount, formCount]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Interview Parts</CardTitle>
        <CardDescription className="text-xs">
          {rounds.length} part{rounds.length !== 1 ? "s" : ""} in this
          interview
          {modeSummary ? ` · ${modeSummary}` : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rounds.map((round, index) => {
          const isCurrent = currentRoundIndex === index;
          const isCompleted = round.status === "completed";

          return (
            <div
              key={`${round.roundOrder}-${round.roundName}`}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                isCurrent
                  ? "border-primary/40 bg-primary/5"
                  : "bg-muted/40"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Part {round.roundOrder}
                </p>
                <p className="font-medium leading-snug">{round.roundName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {isCompleted ? (
                  <CheckCircle2
                    className="size-3.5 text-primary"
                    aria-label="Completed"
                  />
                ) : null}
                {isCurrent ? (
                  <Badge variant="outline" className="text-[10px]">
                    Up next
                  </Badge>
                ) : null}
                <Badge variant="secondary" className="text-xs">
                  {round.deliveryMode === "voice" ? (
                    <Mic className="mr-1 size-3" />
                  ) : (
                    <ClipboardList className="mr-1 size-3" />
                  )}
                  {round.deliveryMode === "voice" ? "Voice" : "Written form"}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
