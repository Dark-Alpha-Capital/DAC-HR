import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ArrowRight } from "lucide-react";

interface WelcomeScreenProps {
  candidateName: string;
  positionName: string;
  roundName: string;
  onContinue: () => void;
}

export default function WelcomeScreen({
  candidateName,
  positionName,
  roundName,
  onContinue,
}: WelcomeScreenProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Company identity */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold select-none">
            DAC
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Dark Alpha Capital
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              AI Screening Interview
            </h1>
          </div>
        </div>

        {/* Candidate + role info */}
        <div className="rounded-xl border bg-card px-6 py-5 space-y-4">
          <p className="text-lg font-medium">
            Hello, <span className="text-primary">{candidateName}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {positionName}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {roundName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Before you begin, we&apos;ll walk you through a short set of instructions
            to help you prepare.
          </p>
        </div>

        <Button size="lg" className="w-full" onClick={onContinue}>
          Continue
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
