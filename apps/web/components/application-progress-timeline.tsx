"use client";

import { useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Eye, Trash2, Plus, Star, MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import RecordInterviewDialogWrapper from "./record-interview-dialog-wrapper";
import { deleteInterview } from "@/lib/actions/delete-interview";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Round {
  id: string;
  name: string;
  description: string | null;
  positionRoundTemplateId: string;
}

interface Interview {
  id: string;
  positionRoundTemplateId: string;
  status: "pending" | "move_forward" | "rejected" | "scheduled";
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

interface ApplicationProgressTimelineProps {
  rounds: Round[];
  interviews: Interview[];
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
    default:
      return (
        <Badge variant="secondary" className="border-0">
          Pending
        </Badge>
      );
  }
};

export default function ApplicationProgressTimeline({
  rounds,
  interviews,
  applicationId,
  selectedInterviewId,
  currentUser,
  users = [],
  application,
}: ApplicationProgressTimelineProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (interviewId: string) => {
    setInterviewToDelete(interviewId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!interviewToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteInterview(interviewToDelete);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Interview deleted successfully");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to delete interview");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setInterviewToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Interviews</h2>
          {interviews.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {interviews.length} recorded
            </Badge>
          )}
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

      {/* Table or Empty State */}
      {interviews.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-1">
            No interviews recorded yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Click "Record Interview" to add the first interview.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-medium">Round</TableHead>
                <TableHead className="font-medium">Interviewer</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Rating</TableHead>
                <TableHead className="text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((interview) => (
                <TableRow
                  key={interview.id}
                  className={
                    selectedInterviewId === interview.id
                      ? "bg-primary/5"
                      : undefined
                  }
                >
                  <TableCell className="font-medium">
                    {interview.roundTemplate.name}
                  </TableCell>
                  <TableCell>
                    {interview.interviewer
                      ? interview.interviewer.name || interview.interviewer.email
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        asChild
                      >
                        <Link href={`/interviews/${interview.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(interview.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interview? This action cannot
              be undone and will also delete any associated feedback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
