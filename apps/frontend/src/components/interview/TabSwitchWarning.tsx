import { AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";

interface TabSwitchWarningProps {
  count: number;
  onDismiss: () => void;
}

export default function TabSwitchWarning({
  count,
  onDismiss,
}: TabSwitchWarningProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex w-full max-w-3xl items-start gap-3 rounded-lg border border-amber-400/50 bg-amber-50 p-3 shadow-lg sm:items-center">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="size-4 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-900">
            Heads up — you left the interview tab
          </p>
          <p className="mt-0.5 text-xs leading-snug text-amber-800">
            Leaving the tab was recorded ({count} time
            {count !== 1 ? "s" : ""}) and may be reviewed as part of your
            interview. Please stay on this tab for the rest of the session.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
