"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Link2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { generateInterviewLink } from "@/lib/actions/generate-interview-link";
import {
  getQuestionsPreview,
  type QuestionPreview,
} from "@/lib/actions/get-questions-preview";
import { sendInterviewEmail } from "@/lib/actions/send-interview-email";

interface GenerateInterviewLinkDialogProps {
  interviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GenerateInterviewLinkDialog({
  interviewId,
  open,
  onOpenChange,
}: GenerateInterviewLinkDialogProps) {
  const [expiresInHours, setExpiresInHours] = useState<"24" | "48" | "72">(
    "48",
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Question preview state
  const [questions, setQuestions] = useState<QuestionPreview[] | null>(null);
  const [questionsOpen, setQuestionsOpen] = useState(false);

  // Email send state
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSentAt, setEmailSentAt] = useState<Date | null>(null);

  // Fetch question preview on mount (so recruiter can see before generating)
  useEffect(() => {
    void getQuestionsPreview(interviewId).then((res) => {
      if ("questions" in res) setQuestions(res.questions);
    });
  }, [interviewId]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateInterviewLink({
        interviewId,
        expiresInHours: parseInt(expiresInHours) as 24 | 48 | 72,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const link = `${window.location.origin}/interview/${result.token}/`;
      setGeneratedLink(link);
      setGeneratedToken(result.token);
      setExpiresAt(new Date(result.linkExpiresAt));
      // Reset email state when a new link is generated
      setEmailSentAt(null);
      setRecipientEmail("");
    } catch {
      toast.error("Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!generatedToken || !generatedLink || !recipientEmail.trim()) return;
    setEmailLoading(true);
    try {
      const result = await sendInterviewEmail({
        token: generatedToken,
        recipientEmail: recipientEmail.trim(),
        interviewLink: generatedLink,
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGeneratedLink(null);
      setGeneratedToken(null);
      setExpiresAt(null);
      setCopied(false);
      setEmailSentAt(null);
      setRecipientEmail("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Generate Interview Link
          </DialogTitle>
          <DialogDescription>
            Create a shareable link for the candidate to take this interview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Link expiry selector */}
          <div className="space-y-2">
            <Label htmlFor="expires">Link expires in</Label>
            <Select
              value={expiresInHours}
              onValueChange={(v) => setExpiresInHours(v as "24" | "48" | "72")}
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

          {/* Generated link display */}
          {generatedLink && (
            <div className="space-y-2">
              <Label>Interview link</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopy}
                  title={copied ? "Copied!" : "Copy link"}
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
          )}

          {/* Send to candidate — shown after link is generated */}
          {generatedLink && (
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
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {generatedLink ? "Regenerate Link" : "Generate Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
