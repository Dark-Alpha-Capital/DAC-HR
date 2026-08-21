import { useState, useEffect } from "react";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { createInterview } from "#/features/interviews/server/mutations/interviews";
import { createInterviewSession } from "#/features/interviews/server/mutations/interviews";
import type { RoundDeliveryMode } from "#/lib/enums";
import { cn } from "#/lib/utils";
import { toast } from "sonner";
import { Bot, Calendar, Check, Copy, Link2, Mic, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ApplicationDetail } from "#/features/applications/types";

type DialogMode = "ai_link" | "manual";

interface RecordInterviewDialogProps {
  applicationId: string;
  application: Pick<ApplicationDetail, "rounds">;
  candidateEmail?: string | null;
  users: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRoundId?: string;
  positionSlug?: string;
}

export default function RecordInterviewDialog({
  applicationId,
  application,
  candidateEmail,
  users,
  currentUserId,
  open,
  onOpenChange,
  initialRoundId,
  positionSlug,
}: RecordInterviewDialogProps) {
  const invalidate = useQueryInvalidation();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<DialogMode>("ai_link");
  const [interviewerId, setInterviewerId] = useState(currentUserId);
  const [roundId, setRoundId] = useState(
    initialRoundId || application.rounds[0]?.id || "",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [roundModes, setRoundModes] = useState<
    Record<string, RoundDeliveryMode>
  >(() =>
    Object.fromEntries(application.rounds.map((r) => [r.id, "form" as const])),
  );
  const [selectedRoundIds, setSelectedRoundIds] = useState<string[]>(() =>
    application.rounds.map((r) => r.id),
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendInviteEmail, setSendInviteEmail] = useState(false);
  const hasCandidateEmail = Boolean(candidateEmail);

  useEffect(() => {
    if (initialRoundId) {
      setRoundId(initialRoundId);
      setMode("manual");
    }
  }, [initialRoundId]);

  useEffect(() => {
    setRoundModes((prev) => {
      const next = { ...prev };
      for (const round of application.rounds) {
        if (!next[round.id]) {
          next[round.id] = "form";
        }
      }
      return next;
    });
  }, [application.rounds]);

  const resetState = () => {
    setGeneratedLink(null);
    setCopied(false);
    setSendInviteEmail(false);
    setMode("ai_link");
    setSelectedRoundIds(application.rounds.map((r) => r.id));
    if (!initialRoundId) {
      setRoundId(application.rounds[0]?.id || "");
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roundId) {
      toast.error("Please select a round");
      return;
    }

    setLoading(true);

    try {
      const result = await createInterview({
        data: {
          applicationId,
          roundId,
          interviewerId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
      });

      if (result.error) {
        toast.error(result.error ?? "Failed to record interview");
      } else {
        toast.success("Interview recorded successfully");
        handleOpenChange(false);
        void invalidate.applicationDetail(applicationId);
      }
    } catch {
      toast.error("An error occurred while recording the interview");
    } finally {
      setLoading(false);
    }
  };

  const handleAiLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (application.rounds.length === 0) {
      toast.error("No rounds configured for this position");
      return;
    }

    if (selectedRoundIds.length === 0) {
      toast.error("Select at least one round to include");
      return;
    }

    setLoading(true);

    try {
      const result = await createInterviewSession({
        data: {
          applicationId,
          roundConfigs: application.rounds
            .filter((round) => selectedRoundIds.includes(round.id))
            .map((round) => ({
              roundId: round.id,
              deliveryMode: roundModes[round.id] ?? "form",
            })),
          sendInviteEmail,
        },
      });

      if (result.error) {
        toast.error(result.error ?? "Failed to generate interview link");
      } else if (result.data?.token) {
        const link = `${window.location.origin}/interview/${result.data.token}`;
        setGeneratedLink(link);
        if (result.data.emailSent) {
          toast.success(
            `Interview link generated and invite email sent to ${candidateEmail}`,
          );
        } else if (sendInviteEmail && !hasCandidateEmail) {
          toast.info(
            "Interview link generated — no email on file for this candidate",
          );
        } else {
          toast.success("Interview link generated");
        }
        void invalidate.applicationDetail(applicationId);
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

  const setRoundMode = (
    roundIdKey: string,
    deliveryMode: RoundDeliveryMode,
  ) => {
    setRoundModes((prev) => ({ ...prev, [roundIdKey]: deliveryMode }));
  };

  const toggleRound = (roundIdKey: string) => {
    setSelectedRoundIds((prev) =>
      prev.includes(roundIdKey)
        ? prev.filter((id) => id !== roundIdKey)
        : [...prev, roundIdKey],
    );
  };

  const selectAllRounds = () => {
    setSelectedRoundIds(application.rounds.map((r) => r.id));
  };

  const selectNoRounds = () => {
    setSelectedRoundIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Record Interview</DialogTitle>
          <DialogDescription>
            Generate a position-level AI interview link or record a manual
            interview for a single round
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="min-w-0 space-y-4 py-2">
            <div className="min-w-0 space-y-2">
              <Label>Shareable link</Label>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 text-sm break-all sm:truncate">
                  {generatedLink}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="shrink-0 self-end sm:self-auto"
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
                Covers {selectedRoundIds.length} of{" "}
                {application.rounds.length} round
                {application.rounds.length !== 1 ? "s" : ""} for this position.
                Expires in 72 hours.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs
            value={mode}
            onValueChange={(v) =>
              // SAFETY: the TabsTrigger values below are exactly the DialogMode
              // literals ("ai_link", "manual").
              setMode(v as DialogMode)
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai_link" className="gap-2">
                <Bot className="h-4 w-4" />
                Generate AI Link
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Plus className="h-4 w-4" />
                Record Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai_link">
              <form onSubmit={handleAiLinkSubmit}>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Generates a link you can send to the candidate — they will
                    take the interview using that link. Select which rounds of
                    this position are included, and choose how the candidate
                    answers each included round: a real-time voice AI agent
                    interview or a simple form interview the candidate fills
                    out.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedRoundIds.length} of {application.rounds.length}{" "}
                        round{application.rounds.length !== 1 ? "s" : ""}{" "}
                        selected
                      </span>
                      <span className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={selectAllRounds}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={selectNoRounds}
                          className="text-xs font-medium text-muted-foreground hover:underline"
                        >
                          None
                        </button>
                      </span>
                    </div>
                    <div className="space-y-3">
                      {application.rounds.map((round) => {
                        const selected = selectedRoundIds.includes(round.id);
                        return (
                          <div
                            key={round.id}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-md border p-3",
                              !selected && "opacity-50",
                            )}
                          >
                            <label
                              className="flex min-w-0 items-center gap-3"
                              onClick={() => toggleRound(round.id)}
                            >
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleRound(round.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Include ${round.name} round`}
                              />
                              <span className="text-sm font-medium">
                                {round.name}
                              </span>
                            </label>
                            <Select
                              value={roundModes[round.id] ?? "form"}
                              onValueChange={(value) =>
                                // SAFETY: the <SelectItem> values are exactly
                                // the RoundDeliveryMode literals ("form",
                                // "voice").
                                setRoundMode(
                                  round.id,
                                  value as RoundDeliveryMode,
                                )
                              }
                              disabled={!selected}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="form">
                                  <span className="flex items-center gap-2">
                                    Form
                                  </span>
                                </SelectItem>
                                <SelectItem value="voice">
                                  <span className="flex items-center gap-2">
                                    <Mic className="h-3.5 w-3.5" />
                                    Voice
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {application.rounds.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3">
                      <p className="text-sm text-destructive">
                        No interview rounds configured for this position.
                      </p>
                      {positionSlug ? (
                        <Button
                          asChild
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                        >
                          <Link
                            to="/positions/$slug"
                            params={{ slug: positionSlug }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add rounds
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2 rounded-md border p-3">
                    <label className="flex items-start gap-3">
                      <Checkbox
                        checked={sendInviteEmail}
                        disabled={!hasCandidateEmail}
                        onCheckedChange={(checked) =>
                          setSendInviteEmail(checked === true)
                        }
                      />
                      <span className="text-sm">
                        <span className="font-medium">
                          Send invite email to candidate
                        </span>
                        {hasCandidateEmail ? (
                          <span className="block text-xs text-muted-foreground">
                            Email the interview link to {candidateEmail}
                          </span>
                        ) : (
                          <span className="block text-xs text-muted-foreground">
                            No email on file for this candidate — copy the link
                            instead
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      application.rounds.length === 0 ||
                      selectedRoundIds.length === 0
                    }
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Generate Link"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="manual">
              <form onSubmit={handleManualSubmit}>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Use this when you conduct the interview yourself. Ask the
                    candidate the questions defined in the selected round for
                    this position, then record the interview details and your
                    evaluation of their responses here.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="round">Round</Label>
                    <Select value={roundId} onValueChange={setRoundId} required>
                      <SelectTrigger id="round">
                        <SelectValue placeholder="Select a round" />
                      </SelectTrigger>
                      <SelectContent>
                        {application.rounds.map((round) => (
                          <SelectItem key={round.id} value={round.id}>
                            {round.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interviewer">Interviewer</Label>
                    <Select
                      value={interviewerId}
                      onValueChange={setInterviewerId}
                      required
                    >
                      <SelectTrigger id="interviewer">
                        <SelectValue placeholder="Select an interviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">
                      Interview Date & Time (Optional)
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="scheduledAt"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When the interview took place (or leave empty)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Recording..." : "Record Interview"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
