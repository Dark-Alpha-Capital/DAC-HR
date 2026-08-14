import { AlertTriangle } from "lucide-react";
import { Button } from "#/components/ui/button";

interface TabSwitchWarningProps {
  count: number;
  onDismiss: () => void;
}

export default function TabSwitchWarning({
  count,
  onDismiss,
}: TabSwitchWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tab switch warning"
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="size-5 text-amber-600" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">
              Heads up — you left the interview tab
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Leaving the tab was recorded ({count} time
              {count !== 1 ? "s" : ""}) and may be reviewed as part of your
              interview. Please stay on this tab for the rest of the session.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={onDismiss}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
