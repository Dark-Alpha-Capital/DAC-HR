import { Check, ClipboardList, Mic } from "lucide-react";
import type { InterviewBundleDetailData } from "~/lib/loaders/interviews";
import { cn } from "~/lib/utils";

type BundleRoundDetail = InterviewBundleDetailData["roundDetails"][number];

interface BundleRoundStepperProps {
  rounds: BundleRoundDetail[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
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
    <div className="rounded-lg border bg-card p-3 sm:p-4">
      <div className="-mb-1 overflow-x-auto pb-1">
        <ol className="flex w-full min-w-max items-start">
          {rounds.map((detail, index) => {
            const status = detail.round.bundleRound.status;
            const completed = status === "completed";
            const inProgress = status === "in_progress";
            const isActive = index === activeIndex;
            const hasConnector = index < rounds.length - 1;
            const score = detail.evaluation?.score;
            const DeliveryIcon =
              detail.round.bundleRound.deliveryMode === "voice"
                ? Mic
                : ClipboardList;

            return (
              <li
                key={detail.round.round.id}
                className={cn(
                  "flex items-start",
                  !hasConnector && "flex-1 justify-center",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-current={isActive ? "step" : undefined}
                  className="group flex flex-col items-center gap-2 rounded-md px-1 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                      completed &&
                        "border-transparent bg-primary text-primary-foreground",
                      inProgress && "border-2 border-primary bg-primary/10",
                      !completed &&
                        !inProgress &&
                        "border-border bg-background",
                      isActive &&
                        "ring-2 ring-ring ring-offset-1 ring-offset-background",
                    )}
                  >
                    {completed ? (
                      <Check className="h-4 w-4" />
                    ) : inProgress ? (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                    )}
                  </span>

                  <span className="flex w-24 flex-col items-center gap-0.5">
                    <span
                      className={cn(
                        "w-full truncate text-xs font-medium leading-tight transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                      title={detail.round.round.name}
                    >
                      {detail.round.round.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      <DeliveryIcon className="h-3 w-3" />
                      {statusLabel(status)}
                      {score != null ? (
                        <span className="font-semibold text-primary">
                          {score}/10
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>

                {hasConnector ? (
                  <span
                    className={cn(
                      "mt-[17px] h-px w-8 sm:w-12",
                      completed ? "bg-primary" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
