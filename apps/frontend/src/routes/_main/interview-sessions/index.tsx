import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { loadInterviewSessionsIndex } from "~/lib/loaders/interview-sessions";
import { Plus, Clock, Eye } from "lucide-react";

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "in_progress":
      return "default";
    case "completed":
      return "secondary";
    case "reviewed":
    case "pending":
    case "invited":
    default:
      return "secondary";
  }
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const Route = createFileRoute("/_main/interview-sessions/")({
  head: () => ({
    meta: [{ title: "Interview Sessions" }],
  }),
  loader: async () => loadInterviewSessionsIndex(),
  component: InterviewSessionsPage,
});

function InterviewSessionsPage() {
  const { sessions, applications, positions } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Interview Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage async self-serve interview sessions for candidates
          </p>
        </div>
        <Link to="/interview-sessions/new">
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            Create Session
          </Button>
        </Link>
      </div>

      <Separator />

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Clock className="size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No interview sessions yet. Create one to send a candidate a
            self-serve interview link.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s: (typeof sessions)[number]) => (
            <Link
              key={s.id}
              to="/interview-sessions/$id"
              params={{ id: s.id }}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        {s.candidate.firstName} {s.candidate.lastName}
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        {s.position.name} — {s.round.name}
                      </CardDescription>
                    </div>
                    <Badge variant={statusVariant(s.status)}>
                      {s.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created: {formatDate(s.createdAt)}</span>
                    {s.startedAt && (
                      <span>Started: {formatDate(s.startedAt)}</span>
                    )}
                    {s.completedAt && (
                      <span>Completed: {formatDate(s.completedAt)}</span>
                    )}
                    <span className="ml-auto flex items-center gap-1">
                      <Eye className="size-3.5" />
                      View details
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
