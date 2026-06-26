import { useState, useMemo } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Eye,
  Trash2,
  Plus,
  Star,
  MessageSquare,
  Circle,
  Bot,
  UserRound,
  Loader2,
  Copy,
  Check,
  Mic,
  ClipboardList,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDate } from "~/lib/utils";
import RecordInterviewDialogWrapper from "./record-interview-dialog-wrapper";
import type {
  InterviewBundleRoundStatus,
  InterviewBundleStatus,
  InterviewMode,
  RoundDeliveryMode,
} from "@workspace/db/enums";
import { deleteInterview } from "~/lib/actions/delete-interview";
import { deleteInterviewBundle } from "~/lib/actions/delete-interview-bundle";
import { toast } from "sonner";
import { useQueryInvalidation } from "~/hooks/use-query-invalidation";

interface Round {
  id: string;
  name: string;
  description: string | null;
}

interface Interview {
  id: string;
  roundId: string;
  mode: InterviewMode;
  status: "pending" | "completed" | "move_forward" | "rejected" | "scheduled";
  rating: number | null;
  scheduledAt: Date | null;
  overallFeedback: string | null;
  createdAt: Date;
  roundTemplate: {
    id: string;
    name: string;
    description: string | null;
  };
  interviewer: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface BundleRound {
  bundleRound: {
    id: string;
    roundOrder: number;
    deliveryMode: RoundDeliveryMode;
    status: InterviewBundleRoundStatus;
  };
  round: {
    id: string;
    name: string;
  };
  session: {
    id: string;
    status: string;
  };
}

interface InterviewBundleItem {
  bundle: {
    id: string;
    token: string;
    status: InterviewBundleStatus;
    expiresAt: Date;
    createdAt: Date;
  };
  rounds: BundleRound[];
}

interface ApplicationProgressTimelineProps {
  rounds: Round[];
  interviews: Interview[];
  bundles?: InterviewBundleItem[];
  applicationId?: string;
  selectedInterviewId?: string;
  currentUser?: {
    id: string;
  } | null;
  users?: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  application?: {
    id: string;
    candidateId: string;
    positionId: string;
    rounds: Round[];
  };
}

const getBundleStatusBadge = (status: InterviewBundleStatus) => {
  switch (status) {
    case "completed":
    case "reviewed":
      return (
        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0">
          Completed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
          In Progress
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="border-0">
          Pending
        </Badge>
      );
  }
};

const getRoundChipStatus = (status: InterviewBundleRoundStatus) => {
  if (status === "completed") return "✓";
  if (status === "in_progress") return "●";
  return "○";
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "move_forward":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
          Move Forward
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
          Rejected
        </Badge>
      );
    case "scheduled":
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
          Scheduled
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0">
          Completed
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="border-0">
          Pending
        </Badge>
      );
  }
};

function BundleCard({
  item,
  applicationId,
  onDelete,
  deleting,
}: {
  item: InterviewBundleItem;
  applicationId?: string;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const completedCount = item.rounds.filter(
    (r) => r.bundleRound.status === "completed",
  ).length;
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/interview/${item.bundle.token}`
      : `/interview/${item.bundle.token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const isExpired = new Date(item.bundle.expiresAt) < new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-600" />
              Position Interview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{item.rounds.length} rounds complete
              {isExpired ? " · Expired" : ` · Expires ${formatDate(item.bundle.expiresAt)}`}
            </p>
          </div>
          {getBundleStatusBadge(isExpired ? "completed" : item.bundle.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {item.rounds.map((r) => (
            <Badge key={r.bundleRound.id} variant="outline" className="text-xs">
              {getRoundChipStatus(r.bundleRound.status)} {r.round.name} ·{" "}
              {r.bundleRound.deliveryMode === "voice" ? (
                <Mic className="inline h-3 w-3 ml-0.5" />
              ) : (
                <ClipboardList className="inline h-3 w-3 ml-0.5" />
              )}{" "}
              {r.bundleRound.deliveryMode}
            </Badge>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs break-all">
            {link}
          </code>
          <div className="flex gap-1 shrink-0">
            <Button variant="secondary" size="icon" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button variant="secondary" size="icon" asChild>
              <Link to={`/interviews/bundle/${item.bundle.id}` as any}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="text-destructive hover:text-destructive"
              disabled={deleting}
              onClick={() => onDelete(item.bundle.id)}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApplicationProgressTimeline({
  rounds,
  interviews,
  bundles = [],
  applicationId,
  selectedInterviewId,
  currentUser,
  users = [],
  application,
}: ApplicationProgressTimelineProps) {
  const invalidate = useQueryInvalidation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBundleDialogOpen, setDeleteBundleDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);
  const [bundleToDelete, setBundleToDelete] = useState<string | null>(null);
  const [deletingInterviewId, setDeletingInterviewId] = useState<string | null>(
    null,
  );
  const [deletingBundleId, setDeletingBundleId] = useState<string | null>(null);

  const manualInterviews = useMemo(
    () => interviews.filter((i) => i.mode === "manual"),
    [interviews],
  );

  const interviewsByRound = useMemo(() => {
    const grouped = new Map<string, Interview[]>();
    rounds.forEach((round) => grouped.set(round.id, []));
    manualInterviews.forEach((interview) => {
      const roundInterviews = grouped.get(interview.roundId) || [];
      roundInterviews.push(interview);
      grouped.set(interview.roundId, roundInterviews);
    });
    return grouped;
  }, [rounds, manualInterviews]);

  const stats = useMemo(() => {
    const roundsWithManual = Array.from(interviewsByRound.values()).filter(
      (r) => r.length > 0,
    ).length;
    return {
      manualCount: manualInterviews.length,
      bundleCount: bundles.length,
      roundsWithManual,
      totalRounds: rounds.length,
    };
  }, [manualInterviews, bundles, interviewsByRound, rounds]);

  const handleDeleteClick = (interviewId: string) => {
    setInterviewToDelete(interviewId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBundleClick = (bundleId: string) => {
    setBundleToDelete(bundleId);
    setDeleteBundleDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!interviewToDelete) return;
    const interviewId = interviewToDelete;
    setDeletingInterviewId(interviewId);
    setDeleteDialogOpen(false);
    try {
      const result = await deleteInterview({ data: interviewId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Interview deleted successfully");
        if (applicationId) void invalidate.applicationDetail(applicationId);
      }
    } catch {
      toast.error("Failed to delete interview");
    } finally {
      setDeletingInterviewId(null);
      setInterviewToDelete(null);
    }
  };

  const handleDeleteBundleConfirm = async () => {
    if (!bundleToDelete) return;
    const bundleId = bundleToDelete;
    setDeletingBundleId(bundleId);
    setDeleteBundleDialogOpen(false);
    try {
      const result = await deleteInterviewBundle({ data: bundleId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Interview link deleted");
        if (applicationId) void invalidate.applicationDetail(applicationId);
      }
    } catch {
      toast.error("Failed to delete interview link");
    } finally {
      setDeletingBundleId(null);
      setBundleToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Interviews</h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {stats.bundleCount > 0 && (
              <span>
                {stats.bundleCount} AI link{stats.bundleCount !== 1 ? "s" : ""}
              </span>
            )}
            {stats.manualCount > 0 && (
              <span>
                {stats.manualCount} manual interview
                {stats.manualCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {currentUser && application && (
          <RecordInterviewDialogWrapper
            applicationId={application.id}
            application={application}
            users={users}
            currentUserId={currentUser.id}
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Interview
              </Button>
            }
          />
        )}
      </div>

      {bundles.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            AI Interview Links
          </h3>
          <div className="space-y-3">
            {bundles.map((item) => (
              <BundleCard
                key={item.bundle.id}
                item={item}
                applicationId={applicationId}
                onDelete={handleDeleteBundleClick}
                deleting={deletingBundleId === item.bundle.id}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Manual Interviews by Round
        </h3>
        {rounds.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No interview rounds configured for this position.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rounds.map((round) => {
              const roundInterviews = interviewsByRound.get(round.id) || [];
              const hasInterviews = roundInterviews.length > 0;

              return (
                <section key={round.id} className="py-5 first:pt-0">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-0.5 flex-1">
                      <h3 className="text-base font-medium">{round.name}</h3>
                      {round.description && (
                        <p className="text-sm text-muted-foreground">
                          {round.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {roundInterviews.length} manual
                    </Badge>
                  </div>
                  {!hasInterviews ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Circle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p className="text-sm mb-1">
                        No manual interviews recorded for this round.
                      </p>
                      <p className="text-xs">
                        Use Record Interview to log one, or generate an AI link
                        above.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="font-medium">Type</TableHead>
                            <TableHead className="font-medium">Interviewer</TableHead>
                            <TableHead className="font-medium">Date</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
                            <TableHead className="font-medium">Rating</TableHead>
                            <TableHead className="text-right font-medium">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roundInterviews.map((interview) => (
                            <TableRow
                              key={interview.id}
                              className={
                                selectedInterviewId === interview.id
                                  ? "bg-primary/5"
                                  : undefined
                              }
                            >
                              <TableCell>
                                <Badge variant="secondary" className="border-0">
                                  <UserRound className="h-3 w-3 mr-1" />
                                  Manual
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {interview.interviewer
                                  ? interview.interviewer.name ||
                                    interview.interviewer.email
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {interview.scheduledAt
                                  ? formatDate(interview.scheduledAt)
                                  : interview.createdAt
                                    ? formatDate(interview.createdAt)
                                    : "-"}
                              </TableCell>
                              <TableCell>{getStatusBadge(interview.status)}</TableCell>
                              <TableCell>
                                {interview.rating ? (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                    <span className="text-sm">{interview.rating}/5</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="secondary" size="sm" className="h-8 w-8 p-0" asChild>
                                    <Link to={`/interviews/${interview.id}` as any}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={deletingInterviewId !== null}
                                    onClick={() => handleDeleteClick(interview.id)}
                                  >
                                    {deletingInterviewId === interview.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interview? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBundleDialogOpen} onOpenChange={setDeleteBundleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Interview Link</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the link and all associated round sessions. The
              candidate will no longer be able to access this interview.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBundleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
