import { Check } from "lucide-react";
import type { InterviewBundleDetailData } from "~/lib/loaders/interviews";
import { cn } from "~/lib/utils";

type BundleRoundDetail = InterviewBundleDetailData["roundDetails"][number];

interface BundleRoundStepperProps {
  rounds: BundleRoundDetail[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function BundleRoundStepper({
  rounds,
  activeIndex,
  onSelect,
}: BundleRoundStepperProps) {
  if (rounds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-lg border bg-card p-2">
      {rounds.map((detail, index) => {
        const status = detail.round.bundleRound.status;
        const completed = status === "completed";
        const isActive = index === activeIndex;
        const score = detail.evaluation?.score;

        return (
          <button
            key={detail.round.round.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="tabular-nums text-xs opacity-70">
              {index + 1}.
            </span>
            <span className="truncate">{detail.round.round.name}</span>
            {completed ? (
              <Check
                className={cn(
                  "h-3.5 w-3.5",
                  isActive ? "text-primary-foreground" : "text-emerald-500",
                )}
              />
            ) : null}
            {score != null ? (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isActive ? "text-primary-foreground/80" : "text-primary",
                )}
              >
                {score}/10
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
