import { useCallback, useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import InterviewBrandHeader from "~/components/interview/InterviewBrandHeader";

interface CompletionScreenProps {
  candidateEmail?: string;
}

export default function CompletionScreen({
  candidateEmail,
}: CompletionScreenProps) {
  const [closeNoticeVisible, setCloseNoticeVisible] = useState(false);

  const handleCloseTab = useCallback(() => {
    try {
      window.close();
    } catch {
      // window.close() never throws; it is silently ignored when the tab
      // was not opened by script (e.g. opened from an email link).
    }
    window.setTimeout(() => setCloseNoticeVisible(true), 300);
  }, []);

  const emailDisplay = candidateEmail?.trim() ? candidateEmail : "your email";

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <InterviewBrandHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 min-h-0 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8">
        <div className="text-center">
          <img
            src="/dac-logo.jpg"
            alt="Dark Alpha Capital"
            className="mx-auto h-16 w-auto"
          />
          <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
            You&apos;ve Completed the Interview
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Thank you for taking the time to interview with{" "}
            <span className="font-medium text-foreground">
              Dark Alpha Capital
            </span>
            . We carefully review every response and genuinely appreciate the
            effort you put into each answer.
          </p>
        </div>

        <div className="flex w-full items-start gap-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-4 text-primary" />
          </div>
          <p className="text-sm leading-relaxed">
            A status update will be sent to{" "}
            <span className="font-medium text-foreground">{emailDisplay}</span>{" "}
            once your results have been reviewed.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <Button size="lg" onClick={handleCloseTab}>
            <X className="mr-2 size-4" />
            Close This Tab
          </Button>
          {closeNoticeVisible ? (
            <p className="text-xs text-muted-foreground">
              If this tab is still open, you can close it now.
            </p>
          ) : null}
        </div>
      </main>

      <footer className="shrink-0 border-t py-4">
        <p className="px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Dark Alpha Capital LLC. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
