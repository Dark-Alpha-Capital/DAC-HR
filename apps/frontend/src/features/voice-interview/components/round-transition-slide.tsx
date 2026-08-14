import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import InterviewBrandHeader from "~/components/interview/InterviewBrandHeader";

export interface TransitionInstruction {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface RoundTransitionSlideProps {
  completedPart: number;
  nextPart: number;
  nextRoundName: string;
  totalParts: number;
  instructions: TransitionInstruction[];
  onContinue: () => void;
  starting?: boolean;
}

export default function RoundTransitionSlide({
  completedPart,
  nextPart,
  nextRoundName,
  totalParts,
  instructions,
  onContinue,
  starting,
}: RoundTransitionSlideProps) {
  const segmentCount = Math.max(totalParts, 1);

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <InterviewBrandHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 min-h-0 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-6 text-primary" />
          </div>
          <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Part {completedPart} of {totalParts} complete
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Thank you for completing Part {completedPart}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Now for Part {nextPart} — {nextRoundName}
          </p>
        </div>

        <div className="flex w-full items-center gap-1.5">
          {Array.from({ length: segmentCount }, (_, index) => {
            const partNumber = index + 1;
            const isDone = partNumber < nextPart;
            const isNext = partNumber === nextPart;
            return (
              <div
                key={partNumber}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  isDone
                    ? "bg-primary"
                    : isNext
                      ? "bg-primary/40"
                      : "bg-muted"
                }`}
              />
            );
          })}
        </div>

        <ul className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {instructions.map((item) => (
            <li key={item.title} className="flex gap-2.5 rounded-lg border p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="size-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-snug">{item.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <Button className="w-full sm:w-auto" size="lg" onClick={onContinue} disabled={starting}>
          {starting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </main>
    </div>
  );
}
