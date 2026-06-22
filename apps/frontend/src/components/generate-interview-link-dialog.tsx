import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { createInterviewSession } from "~/lib/actions/create-interview-session";
import {
  getQuestionsPreview,
  type QuestionPreview,
} from "~/lib/actions/get-questions-preview";
import { sendInterviewEmail } from "~/lib/actions/send-interview-email";
import { toast } from "sonner";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Link2,
  Loader2,
  Mail,
} from "lucide-react";

interface GenerateInterviewLinkDialogProps {
  applicationId: string;
  rounds: Array<{
    id: string;
    name: string;
  }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GenerateInterviewLinkDialog({
  applicationId,
  rounds,
  open,
  onOpenChange,
}: GenerateInterviewLinkDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roundId, setRoundId] = useState(rounds[0]?.id ?? "");
  const [expiresInHours, setExpiresInHours] = useState<"24" | "48" | "72">(
    "72",
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  // Question preview state
  const [questions, setQuestions] = useState<QuestionPreview[] | null>(null);
  const [questionsOpen, setQuestionsOpen] = useState(false);

  // Email send state
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSentAt, setEmailSentAt] = useState<Date | null>(null);

  // Fetch question preview whenever roundId changes
  useEffect(() => {
    if (!roundId) return;
    setQuestions(null);
    void getQuestionsPreview({ data: roundId }).then((res) => {
      if ("questions" in res) setQuestions(res.questions);
    });
  }, [roundId]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGeneratedLink(null);
      setGeneratedToken(null);
      setExpiresAt(null);
      setCopied(false);
      setEmailSentAt(null);
      setRecipientEmail("");
      if (!roundId && rounds[0]) setRoundId(rounds[0].id);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roundId) {
      toast.error("Please select a round");
      return;
    }

    setLoading(true);

    try {
      const result = await createInterviewSession({
        data: {
          applicationId,
          roundId,
          expiryHours: parseInt(expiresInHours),
        },
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to generate interview link",
        );
      } else if (result.data?.token) {
        const link = `${window.location.origin}/interview/${result.data.token}`;
        setGeneratedLink(link);
        setGeneratedToken(result.data.token);
        setExpiresAt(
          result.data.expiresAt ? new Date(result.data.expiresAt) : null,
        );
        setEmailSentAt(null);
        setRecipientEmail("");
        toast.success("Interview link generated");
        router.invalidate();
      }
    } catch {
      toast.error("An error occurred while generating the interview link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSendEmail = async () => {
    if (!generatedToken || !generatedLink || !recipientEmail.trim()) return;
    setEmailLoading(true);
    try {
      const result = await sendInterviewEmail({
        data: {
          token: generatedToken,
          recipientEmail: recipientEmail.trim(),
          interviewLink: generatedLink,
        },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setEmailSentAt(new Date(result.sentAt));
      toast.success("Interview link sent successfully");
    } catch {
      toast.error("Failed to send email");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Generate Interview Link
          </DialogTitle>
          <DialogDescription>
            Create a shareable link for the candidate to complete this interview
            round on their own
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4 py-2">
            {/* Generated link */}
            <div className="space-y-2">
              <Label>Shareable link</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm">
                  {generatedLink}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expires on{" "}
                  {expiresAt.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>

            {/* Send to candidate */}
            <div className="space-y-2 border-t pt-4">
              <Label>Send to candidate</Label>
              {emailSentAt ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    Email sent on{" "}
                    {emailSentAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="candidate@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSendEmail();
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSendEmail}
                    disabled={emailLoading || !recipientEmail.trim()}
                    className="shrink-0"
                  >
                    {emailLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    <span className="ml-1.5">Send</span>
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Round selector */}
              <div className="space-y-2">
                <Label htmlFor="round">Round</Label>
                <Select value={roundId} onValueChange={setRoundId} required>
                  <SelectTrigger id="round">
                    <SelectValue placeholder="Select a round" />
                  </SelectTrigger>
                  <SelectContent>
                    {rounds.map((round) => (
                      <SelectItem key={round.id} value={round.id}>
                        {round.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry selector */}
              <div className="space-y-2">
                <Label htmlFor="expires">Link expires in</Label>
                <Select
                  value={expiresInHours}
                  onValueChange={(v: string) =>
                    setExpiresInHours(v as "24" | "48" | "72")
                  }
                >
                  <SelectTrigger id="expires">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question preview collapsible */}
              {questions !== null && questions.length > 0 && (
                <Collapsible open={questionsOpen} onOpenChange={setQuestionsOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
                    >
                      <span>
                        Preview Questions{" "}
                        <span className="text-muted-foreground font-normal">
                          ({questions.length})
                        </span>
                      </span>
                      {questionsOpen ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ol className="mt-2 max-h-48 overflow-y-auto space-y-2 rounded-md border bg-muted/20 px-3 py-2">
                      {questions.map((q, i) => (
                        <li key={q.id} className="flex gap-2 text-sm">
                          <span className="shrink-0 font-mono text-xs text-muted-foreground pt-0.5">
                            {i + 1}.
                          </span>
                          <div className="space-y-1">
                            <p className="leading-relaxed">{q.questionText}</p>
                            {q.category && (
                              <Badge variant="secondary" className="text-xs">
                                {q.category}
                              </Badge>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <p className="text-xs text-muted-foreground">
                The candidate will answer round questions via the public
                interview page. The interview appears in this tab as an AI
                Session.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || rounds.length === 0}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                {loading ? "Generating..." : "Generate Link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
