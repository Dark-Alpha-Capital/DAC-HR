import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { getSessionById, getResponsesBySessionId, getEvaluationBySessionId } from "@workspace/db/repositories/interview-session-repository";
import { ArrowLeft, Copy, Check, Clock, Calendar } from "lucide-react";
import { useState } from "react";

type ResponseWithQuestion = {
  id: string;
  sessionId: string;
  questionId: string;
  answerText: string | null;
  createdAt: Date;
  updatedAt: Date;
  question: {
    id: string;
    questionText: string;
    questionType: string;
    category: string | null;
    timeLimitSeconds: number | null;
  };
};

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "in_progress": return "default";
    case "completed": return "secondary";
    default: return "secondary";
  }
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const Route = createFileRoute("/_main/interview-sessions/$id/")({
  head: () => ({
    meta: [{ title: "Session Detail" }],
  }),
  loader: async ({ params }) => {
    const row = await getSessionById(params.id);
    if (!row) {
      throw new Error("Session not found");
    }
    const responses = await getResponsesBySessionId(params.id);
    const evaluation = await getEvaluationBySessionId(params.id);
    return { session: row.session, candidate: row.candidate, position: row.position, round: row.round, responses, evaluation };
  },
  component: SessionDetailPage,
});

function SessionDetailPage() {
  const { session, candidate, position, round, responses, evaluation } = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  const interviewLink = `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${session.token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(interviewLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="link" size="icon" asChild>
          <a href="/interview-sessions">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {position.name} — {round.name}
          </p>
        </div>
        <Badge variant={statusVariant(session.status)} className="shrink-0">
          {session.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Session Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-3.5" />
              Created: {formatDate(session.createdAt)}
            </div>
            {session.startedAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5" />
                Started: {formatDate(session.startedAt)}
              </div>
            )}
            {session.completedAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5" />
                Completed: {formatDate(session.completedAt)}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-3.5" />
              Expires: {formatDate(session.expiresAt)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              Tab switches: {session.tabSwitches}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Interview Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                {interviewLink}
              </code>
              <Button variant="secondary" size="icon" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {evaluation && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation</CardTitle>
            <CardDescription>
              Score: {evaluation.score}/100 — {evaluation.recommendation?.replace(/_/g, " ")}
            </CardDescription>
          </CardHeader>
          {evaluation.summary && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
            </CardContent>
          )}
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Responses ({responses.length})
        </h2>
        <div className="space-y-3">
          {responses.map((r: ResponseWithQuestion) => (
            <Card key={r.id}>
              <CardHeader className="pb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {r.question.category || "General"}
                  </Badge>
                  <CardTitle className="text-sm font-medium">
                    {r.question.questionText}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {r.answerText || <span className="italic">No answer</span>}
                </p>
              </CardContent>
            </Card>
          ))}
          {responses.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No responses yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
