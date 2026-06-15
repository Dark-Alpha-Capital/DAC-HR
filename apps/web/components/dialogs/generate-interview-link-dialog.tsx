"use client";

import { useState } from "react";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { generateInterviewLink } from "@/lib/actions/generate-interview-link";

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
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

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
      setExpiresAt(new Date(result.linkExpiresAt));
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGeneratedLink(null);
      setExpiresAt(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
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

          {generatedLink && (
            <div className="space-y-2">
              <Label>Interview link</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-xs" />
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
