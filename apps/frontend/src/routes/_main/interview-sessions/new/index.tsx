import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { getAllApplications } from "@workspace/db/queries";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_main/interview-sessions/new/")({
  head: () => ({
    meta: [{ title: "New Interview Session" }],
  }),
  loader: async () => {
    const applications = await getAllApplications();
    return { applications };
  },
  component: NewSessionPage,
});

function NewSessionPage() {
  const { applications } = Route.useLoaderData();
  const navigate = useNavigate();
  const [applicationId, setApplicationId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [expiryHours, setExpiryHours] = useState(72);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedApp = applications.find((a: typeof applications[number]) => a.id === applicationId);
  const filteredRounds = selectedApp
    ? selectedApp.interviews
        .filter((i: { roundTemplate?: { id: string; name: string } }) => i.roundTemplate)
        .map((i: { roundTemplate: { id: string; name: string } }) => ({
          id: i.roundTemplate.id,
          name: i.roundTemplate.name,
        }))
    : [];

  const handleCreate = async () => {
    if (!applicationId || !roundId) {
      toast.error("Please select an application and round");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interview-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, roundId, expiryHours }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create session");
        return;
      }

      const data = await res.json();
      setResult({ link: data.interviewLink });
      toast.success("Session created");
    } catch {
      toast.error("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.link) {
      navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pt-8">
        <Card>
          <CardHeader>
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Check className="size-5 text-primary" />
            </div>
            <CardTitle className="text-center">Session Created</CardTitle>
            <CardDescription className="text-center">
              Copy the link below and send it to the candidate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
                {result.link}
              </code>
              <Button variant="secondary" size="icon" onClick={handleCopy}>
                {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-center gap-3">
            <Button variant="secondary" onClick={() => setResult(null)}>
              Create Another
            </Button>
            <Button onClick={() => navigate({ to: "/interview-sessions" })}>
              View All Sessions
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      <div className="flex items-center gap-3">
        <Button variant="link" size="icon" onClick={() => navigate({ to: "/interview-sessions" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">New Interview Session</h1>
          <p className="text-sm text-muted-foreground">
            Create a tokenized link for a candidate to complete a self-serve interview.
          </p>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Candidate</Label>
            <Select value={applicationId} onValueChange={(v) => { setApplicationId(v); setRoundId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a candidate application..." />
              </SelectTrigger>
              <SelectContent>
                {applications.map((app: typeof applications[number]) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.candidate.firstName} {app.candidate.lastName} — {app.position.name}
                    {app.status ? ` (${app.status.replace(/_/g, " ")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Round</Label>
            <Select value={roundId} onValueChange={setRoundId} disabled={!applicationId}>
              <SelectTrigger>
                <SelectValue placeholder={applicationId ? "Select a round..." : "Select a candidate first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredRounds.map((r: { id: string; name: string }) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {applicationId && filteredRounds.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No rounds configured for this position.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry">Link Expiry (hours)</Label>
            <Input
              id="expiry"
              type="number"
              min={1}
              max={720}
              value={expiryHours}
              onChange={(e) => setExpiryHours(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">
              Default 72 hours (3 days). Max 720 hours (30 days).
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleCreate}
            disabled={!applicationId || !roundId || loading}
            className="w-full"
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Create Interview Session
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
