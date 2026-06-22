import { useState } from "react";
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
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { createInterviewSession } from "~/lib/actions/create-interview-session";
import type { DeliveryMode } from "@workspace/db/enums";
import { toast } from "sonner";
import { Bot, Check, Copy, Link2 } from "lucide-react";

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
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("hybrid");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGeneratedLink(null);
      setCopied(false);
      if (!roundId && rounds[0]) {
        setRoundId(rounds[0].id);
      }
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
        data: { applicationId, roundId, deliveryMode },
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
              <p className="text-xs text-muted-foreground">
                Share this link with the candidate. It expires in 72 hours.
              </p>
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
              <div className="space-y-2">
                <Label htmlFor="delivery-mode">Delivery mode</Label>
                <Select
                  value={deliveryMode}
                  onValueChange={(value) => setDeliveryMode(value as DeliveryMode)}
                >
                  <SelectTrigger id="delivery-mode">
                    <SelectValue placeholder="Select delivery mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Hybrid (candidate chooses)</SelectItem>
                    <SelectItem value="form">Form only</SelectItem>
                    <SelectItem value="voice">Voice only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Link2 className="h-4 w-4 mr-2" />
                {loading ? "Generating..." : "Generate Link"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
